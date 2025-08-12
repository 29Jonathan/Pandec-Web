from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, me, upload_file, download_url, update_order_status, get_notifications, mark_notification_read, get_unread_count, mark_all_notifications_read

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('me', me),
    path('upload', upload_file),
    path('download', download_url),
    path('orders/<int:order_id>/status/', update_order_status),
    path('notifications', get_notifications),
    path('notifications/<int:notification_id>/read', mark_notification_read),
    path('notifications/unread-count', get_unread_count),
    path('notifications/read-all', mark_all_notifications_read),
]


