from rest_framework import serializers
from .models import Order, Notification, FileUpload


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'shipper', 'shipper_freight_number', 'customer',
            'shipment_type', 'carrier_company', 'carrier_tracking_number',
            'carrier_bl_number', 'vessel_flight_name', 'loading_date',
            'loading_location', 'departure_date', 'port_airport_departure',
            'arrival_date', 'port_airport_arrival', 'packaging_type',
            'total_packages', 'freight_terms', 'includes_container',
            'number_of_containers', 'container_1_number', 'container_2_number',
            'container_3_number', 'container_4_number', 'container_5_number',
            'logistics_status', 'other_remarks', 'created_by', 'created_at'
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


