from rest_framework import serializers

from products.models import ProductVariant
from products.serializers import ProductSerializer
from .models import Order, OrderItem, Shipping


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


class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ("id", "user", "total_price", "status", "created_at", "items")
        read_only_fields = ("user", "created_at", "items")

    def get_items(self, obj):
        qs = OrderItem.objects.filter(order=obj).select_related(
            "product", "product__product", "product__product__category", "product__color", "product__size"
        )
        return OrderItemSerializer(qs, many=True, context=self.context).data
