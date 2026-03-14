from django.contrib.auth.models import User
from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Review, Comment


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ("id", "user", "product", "rating", "created_at")
        read_only_fields = ("user", "created_at")


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "user", "product", "content", "created_at")
        read_only_fields = ("user", "created_at")
