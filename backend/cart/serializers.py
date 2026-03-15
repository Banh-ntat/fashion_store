from rest_framework import serializers

from products.models import Product, ProductVariant
from products.serializers import ProductSerializer
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(source="product.product", read_only=True)
    # Thông tin variant: màu sắc, size
    variant_info = serializers.SerializerMethodField()
    product_variant_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=ProductVariant.objects.select_related("product", "color", "size").all(),
        write_only=True,
        required=False,
    )
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = CartItem
        fields = ("id", "cart", "product", "variant_info", "product_variant_id", "product_id", "quantity")
        read_only_fields = ("cart",)

    def get_variant_info(self, obj: CartItem):
        """Lấy thông tin color và size của variant"""
        if not obj.product:
            return None
        return {
            "color": {"id": obj.product.color.id, "name": obj.product.color.name, "code": obj.product.color.code},
            "size": {"id": obj.product.size.id, "name": obj.product.size.name},
        }

    def validate(self, attrs):
        # Nếu là partial update (PATCH) - chỉ cập nhật quantity - thì bỏ qua validation product
        if self.instance is not None and len(attrs) == 1 and 'quantity' in attrs:
            return attrs
        
        if attrs.get("product"):
            return attrs
        product_id = attrs.pop("product_id", None)
        if product_id:
            variant = ProductVariant.objects.filter(product=product_id).first()
            if variant:
                attrs["product"] = variant
            else:
                raise serializers.ValidationError(
                    {"product_id": "Sản phẩm này chưa có biến thể (variant)."}
                )
        if not attrs.get("product"):
            raise serializers.ValidationError(
                "Cần gửi product_variant_id hoặc product_id."
            )
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "user", "created_at", "items")
        read_only_fields = ("user", "created_at", "items")

    def get_items(self, obj):
        qs = CartItem.objects.filter(cart=obj).select_related(
            "product", "product__product", "product__product__category", "product__color", "product__size"
        )
        return CartItemSerializer(qs, many=True, context=self.context).data
