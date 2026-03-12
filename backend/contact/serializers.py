from rest_framework import serializers

from .models import Contact, Feedback, Policy


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ("id", "name", "email", "message", "created_at")
        read_only_fields = ("created_at",)


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ("id", "user", "message", "created_at")
        read_only_fields = ("user", "created_at")


class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = ("id", "title", "content")
