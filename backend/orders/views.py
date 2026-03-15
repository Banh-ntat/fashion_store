from decimal import Decimal

from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import is_admin, is_order_manager
from cart.models import Cart, CartItem
from .models import Order, OrderItem, Shipping
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

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        """Tạo đơn hàng từ giỏ: Order + OrderItems từ cart + Shipping, sau đó xóa giỏ."""
        user = request.user
        total_price = request.data.get("total_price")
        name = request.data.get("name", "").strip()
        phone = request.data.get("phone", "").strip()
        address = request.data.get("address", "").strip()

        if total_price is None:
            return Response(
                {"detail": "Thiếu total_price."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            total_price = Decimal(str(total_price))
        except (TypeError, ValueError):
            return Response(
                {"detail": "total_price không hợp lệ."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not name or not phone or not address:
            return Response(
                {"detail": "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = Cart.objects.filter(user=user).first()
        if not cart:
            return Response(
                {"detail": "Giỏ hàng trống."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart_items = CartItem.objects.filter(cart=cart).select_related(
            "product", "product__product", "product__product__promotion"
        )
        if not cart_items.exists():
            return Response(
                {"detail": "Giỏ hàng trống."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.create(user=user, total_price=total_price)
        for item in cart_items:
            product = item.product
            prod = product.product
            unit_price = prod.price
            if prod.promotion_id:
                discount = prod.promotion.discount_percent
                unit_price = unit_price * (1 - Decimal(discount) / 100)
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                price=unit_price,
            )
        Shipping.objects.create(order=order, name=name, phone=phone, address=address)
        cart_items.delete()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_order_manager(user):
            return OrderItem.objects.all().select_related(
                "order", "product", "product__product", "product__product__category", "product__color", "product__size"
            )
        return OrderItem.objects.filter(order__user=user).select_related(
            "order", "product", "product__product", "product__product__category", "product__color", "product__size"
        )
