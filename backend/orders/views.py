from rest_framework import permissions, viewsets

from core.permissions import is_admin, is_order_manager, IsOwnerOrAdmin
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_order_manager(user):
            return Order.objects.all().order_by("-created_at")
        return Order.objects.filter(user=user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_order_manager(user):
            return OrderItem.objects.all().select_related("order", "product", "product__category")
        return OrderItem.objects.filter(order__user=user).select_related(
            "order", "product", "product__category"
        )
