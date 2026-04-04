"""API thống kê tổng quan cho trang admin (chỉ nhân viên)."""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contact.models import Contact, Feedback
from core.permissions import is_staff
from orders.models import Order, OrderItem
from products.models import Category, Product, ProductVariant


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_staff(request.user):
            return Response(
                {"detail": "Chỉ nhân viên mới truy cập được."},
                status=status.HTTP_403_FORBIDDEN,
            )

        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        stale_before = now - timedelta(days=2)

        order_qs = Order.objects.all()

        revenue_today = order_qs.filter(created_at__date=today).exclude(
            status="cancelled"
        ).aggregate(s=Sum("total_price"))["s"] or Decimal("0")

        revenue_week = order_qs.filter(created_at__gte=week_ago).exclude(
            status="cancelled"
        ).aggregate(s=Sum("total_price"))["s"] or Decimal("0")

        pending_count = order_qs.filter(status="pending").count()
        stale_pending_ids = list(
            order_qs.filter(status="pending", created_at__lt=stale_before)
            .order_by("created_at")
            .values_list("id", flat=True)[:15]
        )

        low_threshold = 5
        low_stock_variants = ProductVariant.objects.filter(
            stock__lte=low_threshold
        ).count()
        low_stock_products = (
            Product.objects.filter(productvariant__stock__lte=low_threshold)
            .distinct()
            .count()
        )

        month_start = date(today.year, today.month, 1)
        revenue_month = order_qs.filter(
            created_at__date__gte=month_start,
            created_at__date__lte=today,
        ).exclude(status="cancelled").aggregate(s=Sum("total_price"))["s"] or Decimal("0")

        orders_total = order_qs.count()

        # Chuỗi 14 ngày: doanh thu (không tính hủy) + số đơn theo ngày
        revenue_series = []
        for offset in range(13, -1, -1):
            d = today - timedelta(days=offset)
            rev = (
                order_qs.filter(created_at__date=d)
                .exclude(status="cancelled")
                .aggregate(s=Sum("total_price"))["s"]
                or Decimal("0")
            )
            oc = order_qs.filter(created_at__date=d).count()
            revenue_series.append(
                {
                    "date": d.isoformat(),
                    "label": d.strftime("%d/%m"),
                    "revenue": str(rev),
                    "orders": oc,
                }
            )

        status_rows = (
            order_qs.values("status").annotate(c=Count("id")).order_by("status")
        )
        orders_by_status = {row["status"]: row["c"] for row in status_rows}
        for key in ("pending", "shipping", "completed", "cancelled"):
            orders_by_status.setdefault(key, 0)

        top_products_rows = list(
            OrderItem.objects.filter(
                ~Q(order__status="cancelled"),
            )
            .values("product__product__id", "product__product__name")
            .annotate(revenue=Sum(F("price") * F("quantity")))
            .order_by("-revenue")[:8]
        )
        top_products = [
            {
                "id": row["product__product__id"],
                "name": row["product__product__name"] or "—",
                "revenue": str(row["revenue"] or Decimal("0")),
            }
            for row in top_products_rows
        ]

        return Response(
            {
                "revenue_today": str(revenue_today),
                "revenue_week": str(revenue_week),
                "revenue_month": str(revenue_month),
                "orders_today": order_qs.filter(created_at__date=today).count(),
                "orders_total": orders_total,
                "pending_orders": pending_count,
                "stale_pending_order_ids": stale_pending_ids,
                "low_stock_threshold": low_threshold,
                "low_stock_variants": low_stock_variants,
                "low_stock_products": low_stock_products,
                "unhandled_contacts": Contact.objects.filter(handled=False).count(),
                "unhandled_feedbacks": Feedback.objects.filter(handled=False).count(),
                "catalog": {
                    "products": Product.objects.count(),
                    "variants": ProductVariant.objects.count(),
                    "categories": Category.objects.count(),
                },
                "revenue_series": revenue_series,
                "orders_by_status": orders_by_status,
                "top_products": top_products,
            }
        )
