from django.contrib.auth.models import User
from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from core.permissions import RoleChoices


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Cho phép đăng nhập bằng username hoặc email; thông báo lỗi tiếng Việt."""

    def validate(self, attrs):
        username_or_email = (attrs.get("username") or "").strip()
        password = attrs.get("password")

        if not username_or_email or not password:
            raise serializers.ValidationError(
                {"detail": "Vui lòng nhập tên đăng nhập/email và mật khẩu."}
            )

        if "@" in username_or_email:
            user = User.objects.filter(email=username_or_email).first()
        else:
            user = User.objects.filter(username=username_or_email).first()

        if not user:
            raise serializers.ValidationError(
                {"detail": "Tên đăng nhập hoặc mật khẩu không đúng."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "Tài khoản chưa được kích hoạt."}
            )
        if not user.check_password(password):
            raise serializers.ValidationError(
                {"detail": "Tên đăng nhập hoặc mật khẩu không đúng."}
            )

        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password_confirm", "phone", "address")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Tên đăng nhập đã tồn tại")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Mật khẩu xác nhận không khớp"})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password_confirm')
        phone = validated_data.pop('phone', '')
        address = validated_data.pop('address', '')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password
        )

        # Signal đã tạo Profile; chỉ cập nhật phone, address, role
        profile = Profile.objects.get(user=user)
        profile.phone = phone or ""
        profile.address = address or ""
        profile.role = RoleChoices.CUSTOMER
        profile.save(update_fields=["phone", "address", "role"])

        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email không tồn tại trong hệ thống")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Mật khẩu xác nhận không khớp"})
        return data

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu cũ không đúng")
        return value

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        user = self.context['request'].user
        validate_password(value, user)
        return value


class ProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False)
    user = UserSerializer(read_only=True)
    role = serializers.ChoiceField(choices=RoleChoices.CHOICES, required=False)

    class Meta:
        model = Profile
        fields = ("id", "user", "phone", "address", "role", "google_id", "facebook_id", "avatar", "created_at", "updated_at")
        read_only_fields = ("user", "google_id", "facebook_id", "created_at", "updated_at")
