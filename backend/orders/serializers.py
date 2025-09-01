from rest_framework import serializers
from .models import Order, Notification, FileUpload, UserProfile


class OrderSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    
    def get_created_by_username(self, obj):
        """Get username for the user who created the order"""
        try:
            from .models import UserProfile
            user_profile = UserProfile.objects.filter(email=obj.created_by).first()
            return user_profile.username if user_profile else obj.created_by
        except Exception:
            return obj.created_by
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'shipper', 'shipper_email', 'shipper_freight_number', 
            'customer', 'customer_email', 'shipment_type', 'carrier_company', 
            'carrier_tracking_number', 'carrier_bl_number', 'vessel_flight_name', 
            'loading_date', 'loading_location', 'departure_date', 'port_airport_departure',
            'arrival_date', 'port_airport_arrival', 'packaging_type',
            'total_packages', 'freight_terms', 'includes_container',
            'number_of_containers', 'container_1_number', 'container_2_number',
            'container_3_number', 'container_4_number', 'container_5_number',
            'logistics_status', 'other_remarks', 'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_username', 'created_at']


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


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user_id', 'email', 'username', 'role', 'telephone',
            'country', 'city', 'address', 'postcode', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


