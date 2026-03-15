from django.conf import settings
from django.db import models
from rest_framework import serializers

from .models import Category, Promotion, Product, ProductImage, ProductVariant, Color, Size


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description")


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ("id", "name", "discount_percent", "start_date", "end_date")


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ("id", "name", "code")


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ("id", "name")


class ProductVariantSerializer(serializers.ModelSerializer):
    color = ColorSerializer(read_only=True)
    color_id = serializers.PrimaryKeyRelatedField(
        source="color", queryset=Color.objects.all(), write_only=True
    )
    size = SizeSerializer(read_only=True)
    size_id = serializers.PrimaryKeyRelatedField(
        source="size", queryset=Size.objects.all(), write_only=True
    )
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.all(), write_only=True
    )

    class Meta:
        model = ProductVariant
        fields = ("id", "product_id", "color", "color_id", "size", "size_id", "stock")

    def validate(self, attrs):
        product = attrs.get("product")
        color = attrs.get("color")
        size = attrs.get("size")
        if product and color and size:
            # Kiểm tra trùng lặp
            exists = ProductVariant.objects.filter(
                product=product, color=color, size=size
            ).exclude(pk=self.instance.pk if self.instance else None).exists()
            if exists:
                raise serializers.ValidationError(
                    "Biến thể này đã tồn tại (cùng sản phẩm, màu, size)."
                )
        return attrs


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
    # Giá gốc (trước khuyến mãi)
    old_price = serializers.SerializerMethodField()
    # Danh sách variants (màu sắc, kích thước, tồn kho)
    variants = serializers.SerializerMethodField()
    # Danh sách ảnh (cho admin)
    images = ProductImageSerializer(many=True, read_only=True)
    # Cho phép upload ảnh khi tạo/sửa sản phẩm
    upload_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "price",
            "old_price",
            "image",
            "images",
            "upload_images",
            "stock",
            "category",
            "category_id",
            "promotion",
            "promotion_id",
            "variants",
        )

    def create(self, validated_data):
        upload_images = validated_data.pop('upload_images', [])
        product = Product.objects.create(**validated_data)
        # Lưu các ảnh được upload
        for image in upload_images:
            ProductImage.objects.create(product=product, image=image)
        return product

    def update(self, instance, validated_data):
        upload_images = validated_data.pop('upload_images', [])
        # Cập nhật thông tin sản phẩm
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Thêm các ảnh mới được upload
        for image in upload_images:
            ProductImage.objects.create(product=instance, image=image)
        return instance

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

    def get_old_price(self, obj: Product) -> float | None:
        """Trả về giá gốc (nếu có khuyến mãi thì tính lại giá gốc)"""
        if obj.promotion:
            # Tính giá gốc từ giá đã giảm
            discount = obj.promotion.discount_percent
            original_price = float(obj.price) / (1 - discount / 100)
            return round(original_price)
        return None

    def get_variants(self, obj: Product) -> list:
        """Lấy danh sách variants với màu sắc, kích thước và tồn kho"""
        variants = ProductVariant.objects.filter(product=obj).select_related('color', 'size')
        return [
            {
                "id": v.id,
                "color": {"id": v.color.id, "name": v.color.name, "code": v.color.code},
                "size": {"id": v.size.id, "name": v.size.name},
                "stock": v.stock,
            }
            for v in variants
        ]
