from django.contrib.auth.models import User
from rest_framework import serializers

from products.serializers import ProductSerializer
from .models import Order, OrderItem, Shipping


class OrderUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(source="product.product", read_only=True)
    variant_info = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "order", "product", "variant_info", "quantity", "price")
        read_only_fields = ("order",)

    def get_variant_info(self, obj: OrderItem):
        """Lấy thông tin color và size của variant"""
        if not obj.product:
            return None
        return {
            "color": {"id": obj.product.color.id, "name": obj.product.color.name, "code": obj.product.color.code},
            "size": {"id": obj.product.size.id, "name": obj.product.size.name},
        }


class ShippingNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipping
        fields = ("name", "phone", "address", "note")


class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    user = OrderUserSerializer(read_only=True)
    shipping = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "user",
            "subtotal",
            "shipping_fee",
            "total_price",
            "status",
            "created_at",
            "items",
            "shipping",
        )
        read_only_fields = ("user", "created_at", "items", "shipping")

    def get_items(self, obj):
        qs = OrderItem.objects.filter(order=obj).select_related(
            "product", "product__product", "product__product__category", "product__color", "product__size"
        )
        return OrderItemSerializer(qs, many=True, context=self.context).data

    def get_shipping(self, obj):
        try:
            ship = obj.shipping
        except Shipping.DoesNotExist:
            return None
        return ShippingNestedSerializer(ship).data
