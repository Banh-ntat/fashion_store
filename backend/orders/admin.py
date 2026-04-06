from django.contrib import admin

from .models import DiscountCode, Order, OrderItem, Shipping


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "discount_percent",
        "min_order_value",
        "is_active",
        "start_date",
        "end_date",
        "used_count",
        "usage_limit",
    )
    list_filter = ("is_active", "start_date", "end_date")
    search_fields = ("code", "name")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "subtotal",
        "discount_amount",
        "shipping_fee",
        "total_price",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("user__username", "discount_code_snapshot")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "quantity", "price")


@admin.register(Shipping)
class ShippingAdmin(admin.ModelAdmin):
    list_display = ("order", "name", "phone")
    search_fields = ("name", "phone")
