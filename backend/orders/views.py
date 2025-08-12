from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from .models import Order, Notification
from .serializers import OrderSerializer, NotificationSerializer
from .supabase_client import get_supabase_client
import tempfile
import os
import re
from storage3.utils import StorageException  # type: ignore


class IsAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_admin', False):
            return True
        return obj.created_by == request.user.email


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrOwner]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user.email)

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_admin', False):
            qs = Order.objects.all()
        else:
            qs = Order.objects.filter(created_by=user.email)
        order_id = self.request.query_params.get('order_id')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    data = {
        'email': request.user.email,
        'username': getattr(request.user, 'username', None),
        'role': getattr(request.user, 'role', None),
        'is_admin': getattr(request.user, 'is_admin', False),
    }
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'detail': 'No file provided'}, status=400)
    sb = get_supabase_client()
    bucket = 'uploads'
    # sanitize filename to avoid invalid storage keys (no unicode or special chars)
    safe_name = re.sub(r'[^A-Za-z0-9._-]+', '_', file_obj.name)
    if not safe_name:
        safe_name = 'file'
    path = f"{request.user.id}/{safe_name}"

    # storage3 expects a filesystem path; write to temp then upload
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        for chunk in file_obj.chunks():
            tmp.write(chunk)
        temp_path = tmp.name
    try:
        sb.storage.from_(bucket).upload(
            path,
            temp_path,
            {
                'content-type': file_obj.content_type or 'application/octet-stream',
                'x-upsert': 'true',
            },
        )
    except StorageException as exc:
        return Response({'detail': getattr(exc, 'message', str(exc))}, status=400)
    except Exception as exc:  # noqa: BLE001
        return Response({'detail': str(exc)}, status=400)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
    return Response({'path': f"{bucket}/{path}"})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_url(request):
    path = request.query_params.get('path')
    if not path:
        return Response({'detail': 'Missing path'}, status=400)
    sb = get_supabase_client()
    bucket, key = path.split('/', 1)
    # Signed URL for 60 minutes
    res = sb.storage.from_(bucket).create_signed_url(key, 3600)
    if res.get('error'):
        return Response({'detail': str(res['error'])}, status=400)
    url = res.get('signedURL') or res.get('signed_url') or res.get('url')
    return Response({'url': url})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_files(request):
    sb = get_supabase_client()
    bucket = 'uploads'
    prefix = f"{request.user.id}"
    try:
        items = sb.storage.from_(bucket).list(prefix)
    except StorageException as exc:
        return Response({'detail': getattr(exc, 'message', str(exc))}, status=400)
    files = []
    for it in items:
        name = getattr(it, 'name', None) or (isinstance(it, dict) and it.get('name'))
        if not name:
            continue
        
        # Try to get size from various possible attributes
        size = None
        if hasattr(it, 'metadata') and it.metadata:
            size = it.metadata.get('size')
        elif isinstance(it, dict):
            size = it.get('metadata', {}).get('size') if it.get('metadata') else it.get('size')
        elif hasattr(it, 'size'):
            size = it.size
            
        files.append({
            'name': name,
            'path': f"{bucket}/{prefix}/{name}",
            'last_modified': getattr(it, 'updated_at', None) or (isinstance(it, dict) and it.get('updated_at')),
            'size': size,
        })
    return Response({'files': files})


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
        # Check if user owns the order or is admin
        if not request.user.is_admin and order.created_by != request.user.email:
            return Response({'detail': 'Not authorized'}, status=403)
        
        old_status = order.status
        new_status = request.data.get('status')
        if new_status not in ['preparing', 'shipping', 'arrived', 'complete']:
            return Response({'detail': 'Invalid status'}, status=400)
        
        order.status = new_status
        order.save()
        
        # Create notification for the order owner if status changed
        if old_status != new_status and order.created_by != request.user.email:
            message = f"Order {order.order_id} status changed from {old_status} to {new_status}"
            Notification.objects.create(
                user_email=order.created_by,
                order_id=order.order_id,
                order_status=new_status,
                message=message
            )
        
        return Response({'status': order.status})
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_notifications(request):
    """Get all notifications for the current user"""
    notifications = Notification.objects.filter(
        user_email=request.user.email
    ).order_by('-created_at')
    
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.objects.get(
            id=notification_id,
            user_email=request.user.email
        )
        notification.is_read = True
        notification.save()
        return Response({'success': True})
    except Notification.DoesNotExist:
        return Response({'detail': 'Notification not found'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_unread_count(request):
    """Get count of unread notifications"""
    count = Notification.objects.filter(
        user_email=request.user.email,
        is_read=False
    ).count()
    return Response({'count': count})
