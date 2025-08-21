from django.contrib import admin
from .models import Order, Notification, FileUpload


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id', 'shipper', 'customer', 'shipment_type', 'logistics_status',
        'carrier_company', 'departure_date', 'arrival_date', 'created_by', 'created_at'
    )
    list_filter = (
        'shipment_type', 'logistics_status', 'packaging_type', 'freight_terms',
        'includes_container', 'departure_date', 'arrival_date', 'created_at'
    )
    search_fields = (
        'order_id', 'shipper', 'customer', 'carrier_company', 'carrier_tracking_number',
        'carrier_bl_number', 'vessel_flight_name', 'created_by'
    )
    readonly_fields = ('created_by', 'created_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('order_id', 'shipper', 'shipper_freight_number', 'customer')
        }),
        ('Shipment Details', {
            'fields': ('shipment_type', 'carrier_company', 'carrier_tracking_number', 'carrier_bl_number', 'vessel_flight_name')
        }),
        ('Dates and Locations', {
            'fields': ('loading_date', 'loading_location', 'departure_date', 'port_airport_departure', 'arrival_date', 'port_airport_arrival')
        }),
        ('Packaging and Freight', {
            'fields': ('packaging_type', 'total_packages', 'freight_terms')
        }),
        ('Container Information', {
            'fields': ('includes_container', 'number_of_containers', 'container_1_number', 'container_2_number', 'container_3_number', 'container_4_number', 'container_5_number')
        }),
        ('Status and Notes', {
            'fields': ('logistics_status', 'other_remarks')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'order_id', 'order_status', 'is_read', 'created_at')
    list_filter = ('is_read', 'order_status', 'created_at')
    search_fields = ('user_email', 'order_id', 'message')
    readonly_fields = ('created_at',)


@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'uploaded_by', 'uploaded_by_name', 'recipient_email', 'file_size', 'created_at')
    list_filter = ('created_at', 'content_type')
    search_fields = ('file_name', 'uploaded_by', 'uploaded_by_name', 'recipient_email')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
