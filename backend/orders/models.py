from django.db import models


class Order(models.Model):
    order_id = models.CharField(max_length=100, unique=True)
    factory_id = models.CharField(max_length=100)
    customer_id = models.CharField(max_length=100)
    ship_name = models.CharField(max_length=200)
    departure_date = models.DateField()
    arrival_date = models.DateField()
    type = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.IntegerField()
    weight = models.DecimalField(max_digits=12, decimal_places=3)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Order {self.order_id}"
