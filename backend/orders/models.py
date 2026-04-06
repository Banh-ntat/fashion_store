from django.contrib.auth.models import User
from django.db import models

from products.models import ProductVariant


class DiscountCode(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.PositiveIntegerField()
    min_order_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-id",)

    def __str__(self):
        return f"{self.code} ({self.discount_percent}%)"


class Order(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("shipping", "Shipping"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Tam tinh (hang), tinh tren server",
    )
    shipping_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Phi van chuyen (VND)",
    )
    discount_code = models.ForeignKey(
        DiscountCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    discount_code_snapshot = models.CharField(max_length=50, blank=True, default="")
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="So tien giam tu ma giam gia (VND)",
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)


class Shipping(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    note = models.TextField(blank=True, default="")
