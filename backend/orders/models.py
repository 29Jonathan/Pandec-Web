from django.db import models


class Order(models.Model):
    # Basic Information
    order_id = models.CharField(max_length=100, unique=True)
    shipper = models.CharField(max_length=255)  # Username
    shipper_email = models.CharField(max_length=255, blank=True)  # Email for reference
    shipper_freight_number = models.CharField(max_length=100)
    customer = models.CharField(max_length=255)  # Username
    customer_email = models.CharField(max_length=255, blank=True)  # Email for reference
    
    # Shipment Details
    SHIPMENT_TYPE_CHOICES = [
        ('air_freight', 'Air Freight'),
        ('sea_freight', 'Sea Freight'),
        ('rail_freight', 'Rail Freight'),
        ('post', 'Post'),
    ]
    shipment_type = models.CharField(max_length=20, choices=SHIPMENT_TYPE_CHOICES)
    
    # Carrier Information
    carrier_company = models.CharField(max_length=255)
    carrier_tracking_number = models.CharField(max_length=100)
    carrier_bl_number = models.CharField(max_length=100)
    vessel_flight_name = models.CharField(max_length=255)
    
    # Dates and Locations
    loading_date = models.DateField()
    loading_location = models.CharField(max_length=255)
    departure_date = models.DateField()
    port_airport_departure = models.CharField(max_length=255)
    arrival_date = models.DateField()
    port_airport_arrival = models.CharField(max_length=255)
    
    # Packaging Information
    PACKAGING_TYPE_CHOICES = [
        ('pallet', 'Pallet'),
        ('cartons', 'Cartons'),
        ('pieces', 'Pieces'),
    ]
    packaging_type = models.CharField(max_length=20, choices=PACKAGING_TYPE_CHOICES)
    total_packages = models.IntegerField()
    
    # Freight Terms
    FREIGHT_TERMS_CHOICES = [
        ('exw', 'EXW'),
        ('fob', 'FOB'),
        ('cif', 'CIF'),
        ('cfr', 'CFR'),
        ('dap', 'DAP'),
    ]
    freight_terms = models.CharField(max_length=10, choices=FREIGHT_TERMS_CHOICES)
    
    # Container Information
    includes_container = models.BooleanField(default=False)
    number_of_containers = models.IntegerField(default=0)
    container_1_number = models.CharField(max_length=100, blank=True)
    container_2_number = models.CharField(max_length=100, blank=True)
    container_3_number = models.CharField(max_length=100, blank=True)
    container_4_number = models.CharField(max_length=100, blank=True)
    container_5_number = models.CharField(max_length=100, blank=True)
    
    # Status and Metadata
    LOGISTICS_STATUS_CHOICES = [
        ('preparing', 'Preparing'),
        ('shipping', 'Shipping'),
        ('arrived', 'Arrived'),
        ('complete', 'Complete'),
    ]
    logistics_status = models.CharField(
        max_length=20,
        choices=LOGISTICS_STATUS_CHOICES,
        default='preparing'
    )
    
    other_remarks = models.TextField(blank=True)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Order {self.order_id}"


class Notification(models.Model):
    user_email = models.CharField(max_length=255)
    order_id = models.CharField(max_length=100)
    order_status = models.CharField(max_length=20)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Notification for {self.user_email} - Order {self.order_id}"


class FileUpload(models.Model):
    file_path = models.CharField(max_length=500)
    file_name = models.CharField(max_length=255)
    uploaded_by = models.CharField(max_length=255)  # email of uploader
    uploaded_by_name = models.CharField(max_length=255)  # name of uploader
    recipient_email = models.CharField(max_length=255)  # email of recipient
    recipient_name = models.CharField(max_length=255, blank=True)  # name of recipient
    file_size = models.BigIntegerField(null=True, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"File {self.file_name} uploaded by {self.uploaded_by} for {self.recipient_email}"


class UserProfile(models.Model):
    """User profile information for search functionality"""
    user_id = models.CharField(max_length=255, unique=True)  # Supabase user ID
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=255)
    role = models.CharField(max_length=50, blank=True)
    telephone = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['username']
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self) -> str:
        return f"{self.username} ({self.email})"
