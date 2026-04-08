from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from cart.models import Cart, CartItem
from core.permissions import is_admin, is_customer_support, is_order_manager, is_staff, IsAdminOrStaff, IsOrderStaff
from products.models import ProductVariant
from products.serializers import normalize_size_name
from .mail import send_order_confirmation_email
from .models import DiscountCode, Order, OrderItem, Shipping
from .pricing import build_order_totals, normalize_discount_code, unit_price_vnd
from .serializers import DiscountCodeSerializer, OrderItemSerializer, OrderSerializer


class OrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class DiscountCodeViewSet(viewsets.ModelViewSet):
    queryset = DiscountCode.objects.all().order_by("-id")
    serializer_class = DiscountCodeSerializer
    permission_classes = [IsAdminOrStaff]


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrderPagination
    
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.user != request.user:
            return Response(
                {"detail": "Bạn không có quyền hủy đơn hàng này."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if order.status != "pending":
            return Response(
                {"detail": "Chỉ có thể hủy đơn hàng đang chờ xử lý."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            items = OrderItem.objects.filter(order=order).select_related("product")
            for item in items:
                ProductVariant.objects.filter(pk=item.product_id).update(
                    stock=F("stock") + item.quantity
                )
            order.status = "cancelled"
            order.save(update_fields=["status"])
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsOrderStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if is_staff(user) or is_admin(user) or is_order_manager(user) or is_customer_support(user):
            qs = Order.objects.select_related("user", "discount_code").prefetch_related("shipping").all()
        else:
            qs = Order.objects.select_related("user", "discount_code").filter(user=user)

        qs = qs.order_by("-created_at")

        if self.action == "list" and (is_staff(user) or is_admin(user) or is_order_manager(user) or is_customer_support(user)):
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

    def _validation_error_message(self, exc: ValidationError) -> str:
        detail = exc.detail
        if isinstance(detail, list):
            return str(detail[0]) if detail else "Du lieu khong hop le."
        if isinstance(detail, dict):
            first_value = next(iter(detail.values()), "Du lieu khong hop le.")
            if isinstance(first_value, list):
                return str(first_value[0]) if first_value else "Du lieu khong hop le."
            return str(first_value)
        return str(detail)

    def _normalize_cart_item_ids(self, raw_ids):
        if raw_ids in (None, ""):
            return None
        if not isinstance(raw_ids, list):
            raise ValidationError("Danh sach san pham thanh toan khong hop le.")

        normalized_ids = []
        for raw_id in raw_ids:
            try:
                normalized_id = int(raw_id)
            except (TypeError, ValueError):
                raise ValidationError("Danh sach san pham thanh toan khong hop le.")
            if normalized_id <= 0:
                raise ValidationError("Danh sach san pham thanh toan khong hop le.")
            normalized_ids.append(normalized_id)

        if not normalized_ids:
            raise ValidationError("Vui long chon san pham de thanh toan.")
        return list(dict.fromkeys(normalized_ids))

    def _load_cart_items(self, user, *, lock: bool = False, cart_item_ids=None):
        cart_qs = Cart.objects.filter(user=user)
        if lock:
            cart_qs = cart_qs.select_for_update()
        cart = cart_qs.first()
        if not cart:
            raise ValidationError("Giỏ hàng trống.")

        cart_items_qs = CartItem.objects.filter(cart=cart).select_related(
            "product",
            "product__product",
            "product__color",
            "product__size",
        ).order_by("product_id")
        if cart_item_ids is not None:
            cart_items_qs = cart_items_qs.filter(id__in=cart_item_ids)
        if lock:
            cart_items_qs = cart_items_qs.select_for_update()

        cart_items = list(cart_items_qs)
        if not cart_items and cart_item_ids is None:
            raise ValidationError("Giỏ hàng trống.")
        if cart_item_ids is not None and len(cart_items) != len(cart_item_ids):
            raise ValidationError("Mot so san pham da chon khong con trong gio hang.")
        if not cart_items and cart_item_ids is not None:
            raise ValidationError("Vui long chon san pham de thanh toan.")
        return cart, cart_items

    def _build_pricing_payload(self, cart_items, discount_code=None):
        subtotal = Decimal("0")
        for cart_item in cart_items:
            subtotal += unit_price_vnd(cart_item.product.product) * cart_item.quantity

        shipping_fee, discount_amount, total = build_order_totals(subtotal, discount_code)
        return {
            "subtotal": subtotal,
            "shipping_fee": shipping_fee,
            "discount_amount": discount_amount,
            "total_price": total,
            "discount_code": discount_code.code if discount_code else "",
            "discount_name": discount_code.name if discount_code else "",
            "discount_percent": discount_code.discount_percent if discount_code else 0,
        }

    @action(detail=False, methods=["post"], url_path="discount-preview")
    def discount_preview(self, request):
        user = request.user
        code = normalize_discount_code(request.data.get("discount_code"))
        try:
            cart_item_ids = self._normalize_cart_item_ids(request.data.get("cart_item_ids"))
        except ValidationError as exc:
            return Response({"detail": self._validation_error_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _cart, cart_items = self._load_cart_items(user, lock=False, cart_item_ids=cart_item_ids)
        except ValidationError as exc:
            return Response({"detail": self._validation_error_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

        discount_code = None
        if code:
            discount_code = DiscountCode.objects.filter(code__iexact=code).first()
            if discount_code is None:
                return Response({"detail": "Mã giảm giá không tồn tại."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pricing = self._build_pricing_payload(cart_items, discount_code)
        except ValidationError as exc:
            return Response({"detail": self._validation_error_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serialized = {
            "subtotal": str(pricing["subtotal"]),
            "shipping_fee": str(pricing["shipping_fee"]),
            "discount_amount": str(pricing["discount_amount"]),
            "total_price": str(pricing["total_price"]),
            "discount_code": pricing["discount_code"],
            "discount_name": pricing["discount_name"],
            "discount_percent": pricing["discount_percent"],
        }
        return Response(serialized)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        user = request.user
        name = request.data.get("name", "").strip()
        phone = request.data.get("phone", "").strip()
        address = request.data.get("address", "").strip()
        note = (request.data.get("note") or "").strip()
        discount_code_value = normalize_discount_code(request.data.get("discount_code"))
        try:
            cart_item_ids = self._normalize_cart_item_ids(request.data.get("cart_item_ids"))
        except ValidationError as exc:
            return Response({"detail": self._validation_error_message(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if len(note) > 2000:
            note = note[:2000]

        if not name or not phone or not address:
            return Response(
                {"detail": "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                cart, cart_items = self._load_cart_items(user, lock=True, cart_item_ids=cart_item_ids)
            except ValidationError as exc:
                return Response({"detail": self._validation_error_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

            variant_ids = sorted({cart_item.product_id for cart_item in cart_items})
            locked_variants = list(
                ProductVariant.objects.select_for_update()
                .filter(id__in=variant_ids)
                .select_related("product", "color", "size")
                .order_by("id")
            )
            variants_map = {variant.id: variant for variant in locked_variants}
            if len(variants_map) != len(variant_ids):
                return Response(
                    {"detail": "Có sản phẩm trong giỏ không còn tồn tại."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            line_build = []
            subtotal = Decimal("0")
            for cart_item in cart_items:
                variant = variants_map[cart_item.product_id]
                if variant.stock < cart_item.quantity:
                    label = f"{variant.product.name} ({variant.color.name}/{normalize_size_name(variant.size.name)})"
                    return Response(
                        {"detail": f"Không đủ hàng: {label}. Còn {variant.stock}, cần {cart_item.quantity}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                unit = unit_price_vnd(variant.product)
                subtotal += unit * cart_item.quantity
                line_build.append((cart_item, variant, unit))

            discount_code = None
            if discount_code_value:
                discount_code = DiscountCode.objects.select_for_update().filter(code__iexact=discount_code_value).first()
                if discount_code is None:
                    return Response(
                        {"detail": "Mã giảm giá không tồn tại."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            try:
                shipping_fee, discount_amount, total_price = build_order_totals(subtotal, discount_code)
            except ValidationError as exc:
                return Response({"detail": self._validation_error_message(exc)}, status=status.HTTP_400_BAD_REQUEST)

            for cart_item, variant, _unit in line_build:
                rows = ProductVariant.objects.filter(pk=variant.pk, stock__gte=cart_item.quantity).update(
                    stock=F("stock") - cart_item.quantity
                )
                if rows != 1:
                    raise ValidationError(
                        "Không thể cập nhật tồn kho. Có thể sản phẩm đã hết hàng trong lúc đặt. Vui lòng thử lại."
                    )

            order = Order.objects.create(
                user=user,
                subtotal=subtotal,
                discount_code=discount_code,
                discount_code_snapshot=discount_code.code if discount_code else "",
                discount_amount=discount_amount,
                shipping_fee=shipping_fee,
                total_price=total_price,
            )
            for cart_item, variant, unit in line_build:
                OrderItem.objects.create(
                    order=order,
                    product=variant,
                    quantity=cart_item.quantity,
                    price=unit,
                )

            if discount_code is not None:
                DiscountCode.objects.filter(pk=discount_code.pk).update(used_count=F("used_count") + 1)

            Shipping.objects.create(order=order, name=name, phone=phone, address=address, note=note)
            CartItem.objects.filter(cart=cart, id__in=[cart_item.id for cart_item, _variant, _unit in line_build]).delete()

            order_id_for_email = order.id
            transaction.on_commit(lambda oid=order_id_for_email: send_order_confirmation_email(oid))

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_staff(user) or is_admin(user) or is_order_manager(user) or is_customer_support(user):
            return OrderItem.objects.all().select_related(
                "order", "product", "product__product", "product__product__category", "product__color", "product__size"
            )
        return OrderItem.objects.filter(order__user=user).select_related(
            "order", "product", "product__product", "product__product__category", "product__color", "product__size"
        )
