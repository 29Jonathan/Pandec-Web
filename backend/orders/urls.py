from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, me, upload_file, download_url, update_order_status

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('me', me),
    path('upload', upload_file),
    path('download', download_url),
    path('orders/<int:order_id>/status', update_order_status),
]


