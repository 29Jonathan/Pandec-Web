from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, me, search_users, sync_user_profile, debug_user_profiles, upload_file, download_url, delete_file, update_order_status, get_notifications, mark_notification_read, get_unread_count, mark_all_notifications_read

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('me', me),
    path('search-users', search_users),
    path('sync-profile', sync_user_profile),
    path('debug-profiles', debug_user_profiles),
    path('upload', upload_file),
    path('download', download_url),
    path('files/<int:file_id>/delete', delete_file),
    path('orders/<int:order_id>/status/', update_order_status),
    path('notifications', get_notifications),
    path('notifications/<int:notification_id>/read', mark_notification_read),
    path('notifications/unread-count', get_unread_count),
    path('notifications/read-all', mark_all_notifications_read),
]


