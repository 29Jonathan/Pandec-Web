from rest_framework import serializers
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'factory_id', 'customer_id', 'ship_name',
            'departure_date', 'arrival_date', 'type', 'price', 'amount', 'weight',
            'status', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


