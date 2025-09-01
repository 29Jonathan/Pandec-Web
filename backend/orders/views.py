from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from .models import Order, Notification, FileUpload, UserProfile
from .serializers import OrderSerializer, NotificationSerializer, FileUploadSerializer, UserProfileSerializer
from .supabase_client import get_supabase_client
import tempfile
import os
import re
from storage3.utils import StorageException  # type: ignore
from django.db import models


class IsAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_admin', False):
            return True
        # Check if user is the creator, shipper, or customer
        user_email = request.user.email
        return (obj.created_by == user_email or 
                obj.shipper_email == user_email or 
                obj.customer_email == user_email)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrOwner]

    def perform_create(self, serializer):
        # Validate shipper and customer usernames
        shipper_username = serializer.validated_data.get('shipper')
        customer_username = serializer.validated_data.get('customer')
        
        # Look up shipper
        try:
            shipper_profile = UserProfile.objects.filter(username__iexact=shipper_username).first()
            if not shipper_profile:
                raise serializers.ValidationError(f"Shipper '{shipper_username}' not found. Please enter a valid username.")
            shipper_email = shipper_profile.email
        except Exception as e:
            raise serializers.ValidationError(f"Error validating shipper: {str(e)}")
        
        # Look up customer
        try:
            customer_profile = UserProfile.objects.filter(username__iexact=customer_username).first()
            if not customer_profile:
                raise serializers.ValidationError(f"Customer '{customer_username}' not found. Please enter a valid username.")
            customer_email = customer_profile.email
        except Exception as e:
            raise serializers.ValidationError(f"Error validating customer: {str(e)}")
        
        # Save with validated emails
        serializer.save(
            created_by=self.request.user.email,
            shipper_email=shipper_email,
            customer_email=customer_email
        )

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_admin', False):
            qs = Order.objects.all()
        else:
            # Users can see orders where they are creator, shipper, or customer
            qs = Order.objects.filter(
                models.Q(created_by=user.email) |
                models.Q(shipper_email=user.email) |
                models.Q(customer_email=user.email)
            )
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_users(request):
    """Search for users by username using database"""
    username_query = request.query_params.get('username', '').strip()
    
    if not username_query:
        return Response({'detail': 'Username query is required'}, status=400)
    
    if len(username_query) < 2:
        return Response({'detail': 'Username query must be at least 2 characters'}, status=400)
    
    try:
        # Search for users in the database
        # Case-insensitive partial match on username
        matching_users = UserProfile.objects.filter(
            username__icontains=username_query
        ).exclude(
            email=request.user.email  # Exclude current user
        )[:20]  # Limit results
        
        serializer = UserProfileSerializer(matching_users, many=True)
        
        return Response({
            'users': serializer.data,
            'count': len(serializer.data)
        })
        
    except Exception as exc:
        print(f"Search users error: {exc}")
        return Response({'detail': 'An error occurred while searching users'}, status=500)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    file_obj = request.FILES.get('file')
    recipient_username = request.data.get('recipient_email', '').strip()  # Keep same field name for compatibility
    
    if not file_obj:
        return Response({'detail': 'No file provided'}, status=400)
    
    # Look up recipient by username if provided
    recipient_email = ''
    recipient_name = ''
    
    if recipient_username:
        try:
            from .models import UserProfile
            # Try to find user by username
            user_profile = UserProfile.objects.filter(username__iexact=recipient_username).first()
            if user_profile:
                recipient_email = user_profile.email
                recipient_name = user_profile.username
            else:
                # If username not found, treat as email for backward compatibility
                recipient_email = recipient_username
                recipient_name = recipient_username
        except Exception:
            # Fallback to treating as email
            recipient_email = recipient_username
            recipient_name = recipient_username
    else:
        # If no recipient provided, default to admin
        recipient_email = getattr(settings, 'ADMIN_EMAIL', '')
        recipient_name = 'Admin'
    
    sb = get_supabase_client()
    bucket = 'uploads'
    # sanitize filename to avoid invalid storage keys (no unicode or special chars)
    safe_name = re.sub(r'[^A-Za-z0-9._-]+', '_', file_obj.name)
    if not safe_name:
        safe_name = 'file'
    
    # Create a unique path using uploader's email and timestamp
    import time
    timestamp = int(time.time())
    path = f"{request.user.email}/{timestamp}_{safe_name}"

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
        
        # Save file metadata to database
        file_upload = FileUpload.objects.create(
            file_path=f"{bucket}/{path}",
            file_name=file_obj.name,
            uploaded_by=request.user.email,
            uploaded_by_name=getattr(request.user, 'username', request.user.email),
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            file_size=file_obj.size,
            content_type=file_obj.content_type or 'application/octet-stream'
        )
        
        return Response({
            'path': f"{bucket}/{path}",
            'file_id': file_upload.id,
            'message': f'File uploaded successfully for {recipient_name}'
        })
        
    except StorageException as exc:
        return Response({'detail': getattr(exc, 'message', str(exc))}, status=400)
    except Exception as exc:  # noqa: BLE001
        return Response({'detail': str(exc)}, status=400)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass


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
    """List files that the user can access (uploaded by them or sent to them)"""
    user_email = request.user.email
    is_admin = getattr(request.user, 'is_admin', False)
    
    # Get files from database
    if is_admin:
        # Admin can see all files
        file_uploads = FileUpload.objects.all()
    else:
        # Regular users can see files they uploaded or files sent to them
        file_uploads = FileUpload.objects.filter(
            models.Q(uploaded_by=user_email) | models.Q(recipient_email=user_email)
        )
    
    serializer = FileUploadSerializer(file_uploads, many=True)
    return Response({'files': serializer.data})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_file(request, file_id):
    """Delete a file from both Supabase storage and database"""
    try:
        file_upload = FileUpload.objects.get(id=file_id)
        
        # Check permissions: user can delete if they uploaded it, received it, or are admin
        user_email = request.user.email
        is_admin = getattr(request.user, 'is_admin', False)
        
        can_delete = (
            is_admin or 
            file_upload.uploaded_by == user_email or 
            file_upload.recipient_email == user_email
        )
        
        if not can_delete:
            return Response({'detail': 'Not authorized to delete this file'}, status=403)
        
        # Delete from Supabase storage
        sb = get_supabase_client()
        bucket, key = file_upload.file_path.split('/', 1)
        
        try:
            sb.storage.from_(bucket).remove([key])
        except Exception as storage_error:
            # Log the error but continue with database deletion
            print(f"Storage deletion error: {storage_error}")
        
        # Delete from database
        file_upload.delete()
        
        return Response({'message': 'File deleted successfully'})
        
    except FileUpload.DoesNotExist:
        return Response({'detail': 'File not found'}, status=404)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=500)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
        # Check if user owns the order or is admin
        if not request.user.is_admin and order.created_by != request.user.email:
            return Response({'detail': 'Not authorized'}, status=403)
        
        old_status = order.logistics_status
        new_status = request.data.get('logistics_status')
        if new_status not in ['preparing', 'shipping', 'arrived', 'complete']:
            return Response({'detail': 'Invalid status'}, status=400)
        
        order.logistics_status = new_status
        order.save()
        
        # Create notifications for order status changes
        if old_status != new_status:
            message = f"Order {order.order_id} logistics status changed from {old_status} to {new_status}"
            
            # Notify the order owner (if different from the person making the change)
            if order.created_by != request.user.email:
                Notification.objects.create(
                    user_email=order.created_by,
                    order_id=order.order_id,
                    order_status=new_status,
                    message=message
                )
                # Cleanup old notifications for this user
                cleanup_old_notifications(order.created_by)
            
            # Notify admin users (if the person making the change is not admin)
            if not request.user.is_admin:
                admin_email = getattr(settings, 'ADMIN_EMAIL', '')
                if admin_email and admin_email != request.user.email:
                    Notification.objects.create(
                        user_email=admin_email,
                        order_id=order.order_id,
                        order_status=new_status,
                        message=f"Admin notification: {message}"
                    )
                    # Cleanup old notifications for admin
                    cleanup_old_notifications(admin_email)
        
        return Response({'logistics_status': order.logistics_status})
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_notifications(request):
    """Get all notifications for the current user (limited to 50)"""
    notifications = Notification.objects.filter(
        user_email=request.user.email
    ).order_by('-created_at')[:50]
    
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


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for current user"""
    Notification.objects.filter(user_email=request.user.email, is_read=False).update(is_read=True)
    return Response({'success': True})


def cleanup_old_notifications(user_email: str, max_notifications: int = 50):
    """Delete old notifications to keep only the latest max_notifications"""
    notifications = Notification.objects.filter(user_email=user_email).order_by('-created_at')
    count = notifications.count()
    
    if count > max_notifications:
        # Get IDs of notifications to delete (oldest ones)
        notifications_to_delete = notifications[max_notifications:].values_list('id', flat=True)
        Notification.objects.filter(id__in=notifications_to_delete).delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_unread_count(request):
    """Get count of unread notifications"""
    count = Notification.objects.filter(
        user_email=request.user.email,
        is_read=False
    ).count()
    return Response({'count': count})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sync_user_profile(request):
    """Sync current user's profile to the database"""
    try:
        from .models import UserProfile
        
        user = request.user
        user_meta = getattr(user, 'user_metadata', {}) or {}
        
        # Extract user data with fallbacks
        username = user_meta.get('username') or user_meta.get('name') or user.email
        role = user_meta.get('role') or ''
        telephone = user_meta.get('telephone') or user_meta.get('phone') or ''
        country = user_meta.get('country') or ''
        city = user_meta.get('city') or ''
        address = user_meta.get('address') or ''
        postcode = user_meta.get('postcode') or ''
        
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(
            user_id=user.id,
            defaults={
                'email': user.email,
                'username': username,
                'role': role,
                'telephone': telephone,
                'country': country,
                'city': city,
                'address': address,
                'postcode': postcode,
            }
        )
        
        if not created:
            # Update existing profile with latest data
            profile.email = user.email
            profile.username = username
            profile.role = role
            profile.telephone = telephone
            profile.country = country
            profile.city = city
            profile.address = address
            profile.postcode = postcode
            profile.save()
        
        serializer = UserProfileSerializer(profile)
        return Response({
            'profile': serializer.data,
            'created': created,
            'message': 'Profile synced successfully'
        })
        
    except Exception as exc:
        print(f"Sync user profile error: {exc}")
        return Response({'detail': 'Failed to sync user profile'}, status=500)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def debug_user_profiles(request):
    """Debug endpoint to check user profiles in database"""
    try:
        from .models import UserProfile
        
        # Get all user profiles
        profiles = UserProfile.objects.all()
        serializer = UserProfileSerializer(profiles, many=True)
        
        return Response({
            'profiles': serializer.data,
            'count': len(serializer.data)
        })
        
    except Exception as exc:
        print(f"Debug user profiles error: {exc}")
        return Response({'detail': 'Failed to get user profiles'}, status=500)
