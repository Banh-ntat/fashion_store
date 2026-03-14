from django.conf import settings
from django.db import models
from rest_framework import serializers

from .models import Category, Promotion, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description")


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ("id", "name", "discount_percent", "start_date", "end_date")


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image")


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
    # Ảnh đầu tiên của sản phẩm
    image = serializers.SerializerMethodField()
    # Tổng tồn kho (từ ProductVariant)
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "price",
            "image",
            "stock",
            "category",
            "category_id",
            "promotion",
            "promotion_id",
        )

    def get_image(self, obj: Product) -> str:
        """Lấy URL ảnh đầu tiên của sản phẩm, hoặc trả về placeholder"""
        first_img = ProductImage.objects.filter(product=obj).first()
        if first_img and first_img.image:
            img_url = first_img.image.url
            # Nếu có request context, dùng build_absolute_uri
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(img_url)
            # Nếu không, nối với MEDIA_URL
            if img_url and not img_url.startswith('http'):
                return settings.MEDIA_URL + img_url.lstrip('/')
            return img_url
        # Trả về placeholder nếu không có ảnh
        return f'https://via.placeholder.com/400x500?text={obj.name.replace(" ", "+")}'

    def get_stock(self, obj: Product) -> int:
        """Tính tổng tồn kho từ các variant"""
        total = ProductVariant.objects.filter(product=obj).aggregate(total=models.Sum("stock"))
        return total["total"] or 0
