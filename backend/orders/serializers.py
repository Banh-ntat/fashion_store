from rest_framework import serializers

from products.models import Product
from products.serializers import ProductSerializer
from .models import Order, OrderItem, Shipping


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.all(), write_only=True
    )

    class Meta:
        model = OrderItem
        fields = ("id", "order", "product", "product_id", "quantity", "price")
        read_only_fields = ("order",)


class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ("id", "user", "total_price", "status", "created_at", "items")
        read_only_fields = ("user", "created_at", "items")

    def get_items(self, obj):
        qs = OrderItem.objects.filter(order=obj).select_related("product", "product__category")
        return OrderItemSerializer(qs, many=True, context=self.context).data
