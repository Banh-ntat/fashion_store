from rest_framework import permissions, viewsets

from core.permissions import is_admin, is_customer_support
from .models import Contact, Feedback, Policy
from .serializers import ContactSerializer, FeedbackSerializer, PolicySerializer


class ContactViewSet(viewsets.ModelViewSet):
    """Contact - ai cũng có thể gửi liên hệ (cho phép all), nhưng chỉ admin/support mới xem được"""
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        """Allow anyone to create, but only staff to view/modify"""
        if self.action in ['create']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_customer_support(user):
            return Contact.objects.all().order_by("-created_at")
        return Contact.objects.none()  # Non-staff can't see contacts


class FeedbackViewSet(viewsets.ModelViewSet):
    """Feedback - khách hàng gửi feedback, admin/support quản lý"""
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        if self.action in ['create']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_customer_support(user):
            return Feedback.objects.all().order_by("-created_at")
        return Feedback.objects.filter(user=user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PolicyViewSet(viewsets.ReadOnlyModelViewSet):
    """Policy - ai cũng có thể xem"""
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer
    permission_classes = [permissions.AllowAny]
