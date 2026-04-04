from django.contrib.auth.models import User
from rest_framework import serializers

from accounts.serializers import UserSerializer
from core.permissions import is_staff
from .models import Review, Comment


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    product_name = serializers.SerializerMethodField()
    variant_info = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "product",
            "product_name",
            "variant_info",
            "rating",
            "feedback_type",
            "content",
            "is_visible",
            "created_at",
        )
        read_only_fields = ("user", "created_at")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and not is_staff(request.user):
            attrs.pop("is_visible", None)
        return attrs

    def get_product_name(self, obj):
        return obj.product.product.name if obj.product else ''

    def get_variant_info(self, obj):
        if obj.product:
            return {
                'color': {'id': obj.product.color.id, 'name': obj.product.color.name, 'code': obj.product.color.code},
                'size': {'id': obj.product.size.id, 'name': obj.product.size.name}
            }
        return None


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "user", "product", "content", "created_at")
        read_only_fields = ("user", "created_at")
