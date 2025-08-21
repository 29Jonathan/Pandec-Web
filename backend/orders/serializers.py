from rest_framework import serializers
from .models import Order, Notification, FileUpload


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'factory_id', 'customer_id', 'ship_name',
            'departure_date', 'arrival_date', 'type', 'price', 'amount', 'weight',
            'status', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'order_id', 'order_status', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class FileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileUpload
        fields = [
            'id', 'file_path', 'file_name', 'uploaded_by', 'uploaded_by_name',
            'recipient_email', 'recipient_name', 'file_size', 'content_type', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'file_size', 'content_type', 'created_at']


