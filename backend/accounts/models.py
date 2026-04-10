from django.db import models
from django.contrib.auth.models import User

from core.permissions import RoleChoices


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.CHOICES,
        default=RoleChoices.CUSTOMER
    )
    google_id = models.CharField(max_length=255, blank=True, null=True)
    facebook_id = models.CharField(max_length=255, blank=True, null=True)
    # max_length: cột DB lưu path/URL; URL ảnh Facebook/Google có thể dài > 100 ký tự
    avatar = models.ImageField(
        upload_to="avatars/", blank=True, null=True, max_length=1024
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username
