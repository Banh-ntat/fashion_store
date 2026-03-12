from rest_framework import serializers

from .models import Category, Promotion, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description")


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ("id", "name", "discount_percent", "start_date", "end_date")


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category", queryset=Category.objects.all(), write_only=True
    )
    promotion = PromotionSerializer(read_only=True)
    promotion_id = serializers.PrimaryKeyRelatedField(
        source="promotion",
        queryset=Promotion.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "price",
            "old_price",
            "stock",
            "image",
            "category",
            "category_id",
            "promotion",
            "promotion_id",
        )
