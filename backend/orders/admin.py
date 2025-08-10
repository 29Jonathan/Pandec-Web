from django.contrib import admin
from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id', 'factory_id', 'customer_id', 'ship_name',
        'departure_date', 'arrival_date', 'type', 'price',
        'amount', 'weight', 'created_by', 'created_at'
    )
    search_fields = ('order_id', 'factory_id', 'customer_id', 'ship_name', 'type', 'created_by')
    list_filter = ('departure_date', 'arrival_date', 'type', 'created_at')
