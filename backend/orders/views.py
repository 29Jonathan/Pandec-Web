from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from .models import Order
from .serializers import OrderSerializer
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
            return Order.objects.all()
        return Order.objects.filter(created_by=user.email)


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
        files.append({
            'name': name,
            'path': f"{bucket}/{prefix}/{name}",
            'last_modified': getattr(it, 'updated_at', None) or (isinstance(it, dict) and it.get('updated_at')),
            'size': getattr(it, 'size', None) or (isinstance(it, dict) and it.get('size')),
        })
    return Response({'files': files})
