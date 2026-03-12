from rest_framework import serializers

from products.models import Product
from products.serializers import ProductSerializer
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.all(), write_only=True
    )

    class Meta:
        model = CartItem
        fields = ("id", "cart", "product", "product_id", "quantity")
        read_only_fields = ("cart",)


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "user", "created_at", "items")
        read_only_fields = ("user", "created_at", "items")

    def get_items(self, obj):
        qs = CartItem.objects.filter(cart=obj).select_related("product", "product__category")
        return CartItemSerializer(qs, many=True, context=self.context).data
