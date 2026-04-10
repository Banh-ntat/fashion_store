from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

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

    @property
    def is_usage_exhausted(self) -> bool:
        return self.usage_limit is not None and self.used_count >= self.usage_limit

    @property
    def effective_is_active(self) -> bool:
        today = timezone.localdate()
        return (
            self.is_active
            and self.start_date <= today <= self.end_date
            and not self.is_usage_exhausted
        )

    @property
    def status(self) -> str:
        return "active" if self.effective_is_active else "expired"

    @property
    def status_label(self) -> str:
        return "Dang hoat dong" if self.effective_is_active else "Het han"


class Order(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("shipping", "Shipping"),
        ("returning", "Returning"),
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
    confirmed_by_user = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

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

class ReturnRequest(models.Model):
    STATUS_CHOICES = (
        ("pending", "Chờ duyệt"),
        ("approved", "Đã duyệt"),
        ("rejected", "Từ chối"),
        ("completed", "Hoàn thành"),
    )
    REASON_CHOICES = (
        ("wrong_item", "Sản phẩm sai"),
        ("damaged", "Sản phẩm hỏng/lỗi"),
        ("not_as_described", "Không đúng mô tả"),
        ("changed_mind", "Thay đổi quyết định"),
        ("other", "Lý do khác"),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="return_requests")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="return_requests")
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"ReturnRequest #{self.id} — Order #{self.order_id} ({self.status})"