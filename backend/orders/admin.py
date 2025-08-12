from django.contrib import admin
from .models import Order, Notification


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id', 'factory_id', 'customer_id', 'ship_name',
        'departure_date', 'arrival_date', 'type', 'price',
        'amount', 'weight', 'status', 'created_by', 'created_at'
    )
    search_fields = ('order_id', 'factory_id', 'customer_id', 'ship_name', 'type', 'created_by')
    list_filter = ('departure_date', 'arrival_date', 'type', 'status', 'created_at')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'order_id', 'order_status', 'is_read', 'created_at')
    list_filter = ('is_read', 'order_status', 'created_at')
    search_fields = ('user_email', 'order_id', 'message')
    readonly_fields = ('created_at',)
