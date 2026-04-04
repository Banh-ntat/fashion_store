from decimal import Decimal

from django.db import transaction
from django.db.models import F

from .mail import send_order_confirmation_email
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from core.permissions import is_admin, is_customer_support, is_order_manager, IsOrderStaff
from cart.models import Cart, CartItem
from products.models import ProductVariant
from .models import Order, OrderItem, Shipping
from .pricing import shipping_fee_vnd, unit_price_vnd
from .serializers import OrderSerializer, OrderItemSerializer


class OrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrderPagination

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsOrderStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_order_manager(user) or is_customer_support(user):
            qs = (
                Order.objects.select_related("user")
                .prefetch_related("shipping")
                .all()
            )
        else:
            qs = Order.objects.select_related("user").filter(user=user)

        qs = qs.order_by("-created_at")

        if self.action == "list" and (
            is_admin(user) or is_order_manager(user) or is_customer_support(user)
        ):
            st = self.request.query_params.get("status")
            if st:
                qs = qs.filter(status=st)
            date_from = self.request.query_params.get("date_from")
            date_to = self.request.query_params.get("date_to")
            if date_from:
                qs = qs.filter(created_at__date__gte=date_from)
            if date_to:
                qs = qs.filter(created_at__date__lte=date_to)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        """Tạo đơn từ giỏ: tính tiền hoàn toàn trên server, trừ tồn kho (transaction + khóa hàng)."""
        user = request.user
        name = request.data.get("name", "").strip()
        phone = request.data.get("phone", "").strip()
        address = request.data.get("address", "").strip()
        note = (request.data.get("note") or "").strip()
        if len(note) > 2000:
            note = note[:2000]

        if not name or not phone or not address:
            return Response(
                {"detail": "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            cart = Cart.objects.select_for_update().filter(user=user).first()
            if not cart:
                return Response(
                    {"detail": "Giỏ hàng trống."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cart_items = list(
                CartItem.objects.filter(cart=cart)
                .select_related(
                    "product",
                    "product__product",
                    "product__product__promotion",
                    "product__color",
                    "product__size",
                )
                .order_by("product_id")
            )
            if not cart_items:
                return Response(
                    {"detail": "Giỏ hàng trống."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            variant_ids = sorted({ci.product_id for ci in cart_items})
            locked_variants = list(
                ProductVariant.objects.select_for_update()
                .filter(id__in=variant_ids)
                .select_related("product", "color", "size")
                .order_by("id")
            )
            variants_map = {v.id: v for v in locked_variants}
            if len(variants_map) != len(variant_ids):
                return Response(
                    {"detail": "Có sản phẩm trong giỏ không còn tồn tại."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            subtotal = Decimal("0")
            line_build = []
            for ci in cart_items:
                v = variants_map[ci.product_id]
                if v.stock < ci.quantity:
                    label = f"{v.product.name} ({v.color.name}/{v.size.name})"
                    return Response(
                        {
                            "detail": (
                                f"Không đủ hàng: {label}. "
                                f"Còn {v.stock}, cần {ci.quantity}."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                unit = unit_price_vnd(v.product)
                line_total = unit * ci.quantity
                subtotal += line_total
                line_build.append((ci, v, unit))

            ship = shipping_fee_vnd(subtotal)
            total = subtotal + ship

            # Trừ tồn kho trước khi tạo đơn; nếu lỗi → rollback toàn bộ (không dùng return Response sau khi đã ghi DB)
            for _ci, v, _unit in line_build:
                rows = ProductVariant.objects.filter(
                    pk=v.pk, stock__gte=_ci.quantity
                ).update(stock=F("stock") - _ci.quantity)
                if rows != 1:
                    raise ValidationError(
                        "Không thể cập nhật tồn kho (có thể hết hàng trong lúc đặt). Vui lòng thử lại."
                    )

            order = Order.objects.create(
                user=user,
                subtotal=subtotal,
                shipping_fee=ship,
                total_price=total,
            )
            for _ci, v, unit in line_build:
                OrderItem.objects.create(
                    order=order,
                    product=v,
                    quantity=_ci.quantity,
                    price=unit,
                )

            Shipping.objects.create(
                order=order, name=name, phone=phone, address=address, note=note
            )
            CartItem.objects.filter(cart=cart).delete()

            order_id_for_email = order.id
            transaction.on_commit(
                lambda oid=order_id_for_email: send_order_confirmation_email(oid)
            )

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user) or is_order_manager(user) or is_customer_support(user):
            return OrderItem.objects.all().select_related(
                "order", "product", "product__product", "product__product__category", "product__color", "product__size"
            )
        return OrderItem.objects.filter(order__user=user).select_related(
            "order", "product", "product__product", "product__product__category", "product__color", "product__size"
        )
