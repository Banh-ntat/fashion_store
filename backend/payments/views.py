"""Return / IPN / Notify cho VNPay và MoMo."""

from __future__ import annotations

import json
import logging
from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from . import momo, vnpay
from .services import mark_order_paid, mark_order_payment_failed

logger = logging.getLogger(__name__)


def _vnpay_guard_order(order_id: int):
    """Trả (order, None) nếu hợp lệ; (None, 'missing'|'wrong_method')."""
    from orders.models import Order

    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return None, "missing"
    if order.payment_method != "vnpay":
        logger.warning("VNPay callback payment_method mismatch order=%s", order_id)
        return None, "wrong_method"
    return order, None


def _frontend_orders_url(**params) -> str:
    base = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
    q = urlencode(params)
    return f"{base}/orders?{q}" if q else f"{base}/orders"


class VnpayReturnView(View):
    """Trình duyệt quay lại sau thanh toán VNPay."""

    def get(self, request):
        from decimal import Decimal

        ok, info = vnpay.verify_callback(request.GET)
        oid = info.get("order_id")
        if ok and oid:
            order, vnp_err = _vnpay_guard_order(oid)
            if vnp_err == "missing":
                return HttpResponseRedirect(_frontend_orders_url(payment="failed", reason="order"))
            if vnp_err == "wrong_method":
                return HttpResponseRedirect(_frontend_orders_url(payment="failed", order_id=oid))

            raw = info.get("raw") or {}
            vnp_amount = raw.get("vnp_Amount")
            if vnp_amount is not None and str(vnp_amount).strip() != "":
                try:
                    if int(str(vnp_amount)) != int(order.total_price.quantize(Decimal("1"))) * 100:
                        logger.warning("VNPay return amount mismatch order=%s", oid)
                except (TypeError, ValueError):
                    pass

            txn = str(info.get("transaction_no") or "")
            mark_order_paid(oid, txn)
            return HttpResponseRedirect(_frontend_orders_url(payment="success", order_id=oid))

        if oid and info.get("response_code") not in (None, "", "00"):
            mark_order_payment_failed(oid)
        fail_params: dict[str, str] = {"payment": "failed", "reason": str(info.get("reason") or "vnpay")}
        rc = str(info.get("response_code") or request.GET.get("vnp_ResponseCode") or "").strip()
        if rc:
            fail_params["vnp_rc"] = rc
        return HttpResponseRedirect(_frontend_orders_url(**fail_params))


class VnpayIpnView(View):
    """Server-to-server VNPay (GET query giống return)."""

    def get(self, request):
        from decimal import Decimal

        ok, info = vnpay.verify_callback(request.GET)
        oid = info.get("order_id")
        if info.get("reason") in ("missing_secret", "missing_hash", "bad_signature"):
            return HttpResponse(
                json.dumps({"RspCode": "97", "Message": "Fail"}),
                content_type="application/json",
                status=400,
            )
        if not oid:
            return HttpResponse(
                json.dumps({"RspCode": "97", "Message": "Fail"}),
                content_type="application/json",
                status=400,
            )
        if ok:
            order, vnp_err = _vnpay_guard_order(oid)
            if vnp_err == "missing":
                return HttpResponse(
                    json.dumps({"RspCode": "01", "Message": "Order not found"}),
                    content_type="application/json",
                )
            if vnp_err == "wrong_method":
                return HttpResponse(
                    json.dumps({"RspCode": "04", "Message": "Reject"}),
                    content_type="application/json",
                )
            raw = info.get("raw") or {}
            vnp_amount = raw.get("vnp_Amount")
            if vnp_amount is not None and str(vnp_amount).strip() != "":
                try:
                    if int(str(vnp_amount)) != int(order.total_price.quantize(Decimal("1"))) * 100:
                        logger.warning("VNPay IPN amount mismatch order=%s", oid)
                except (TypeError, ValueError):
                    pass
            txn = str(info.get("transaction_no") or "")
            mark_order_paid(oid, txn)
            return HttpResponse(
                json.dumps({"RspCode": "00", "Message": "Confirm Success"}),
                content_type="application/json",
            )
        return HttpResponse(
            json.dumps({"RspCode": "01", "Message": "Reject"}),
            content_type="application/json",
        )


@method_decorator(csrf_exempt, name="dispatch")
class MomoNotifyView(View):
    """Webhook MoMo (POST JSON)."""

    def post(self, request):
        try:
            body = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return HttpResponseBadRequest("invalid json")

        if not momo.verify_notify_signature(body):
            logger.warning("MoMo notify bad signature")
            return HttpResponse(
                json.dumps({"status": 1, "message": "Bad signature"}),
                content_type="application/json",
                status=400,
            )

        oid = momo.parse_order_id_from_momo(body.get("orderId"))
        if not oid:
            return HttpResponseBadRequest("bad orderId")

        result = int(body.get("resultCode", -1))
        if result == 0:
            trans_id = str(body.get("transId") or "")
            mark_order_paid(oid, trans_id)
        else:
            mark_order_payment_failed(oid)

        return HttpResponse(
            json.dumps({"status": 0, "message": "ok"}),
            content_type="application/json",
        )


class MomoReturnView(View):
    """Trình duyệt quay lại từ MoMo — không dùng cùng chữ ký webhook; xác minh đơn + resultCode."""

    def get(self, request):
        from decimal import Decimal

        from orders.models import Order

        oid = momo.parse_order_id_from_momo(request.GET.get("orderId"))
        if not oid:
            return HttpResponseRedirect(_frontend_orders_url(payment="failed"))

        try:
            result = int(request.GET.get("resultCode", -1))
        except (TypeError, ValueError):
            result = -1

        try:
            order = Order.objects.get(pk=oid)
        except Order.DoesNotExist:
            return HttpResponseRedirect(_frontend_orders_url(payment="failed"))

        if order.payment_method != "momo":
            return HttpResponseRedirect(_frontend_orders_url(payment="failed", order_id=oid))

        raw_amount = request.GET.get("amount")
        if raw_amount is not None and str(raw_amount).strip() != "":
            try:
                if Decimal(str(raw_amount)) != order.total_price.quantize(Decimal("1")):
                    logger.warning("MoMo return amount mismatch order=%s", oid)
            except Exception:
                pass

        if result == 0:
            mark_order_paid(oid, str(request.GET.get("transId") or ""))
            return HttpResponseRedirect(_frontend_orders_url(payment="success", order_id=oid))

        mark_order_payment_failed(oid)
        return HttpResponseRedirect(_frontend_orders_url(payment="failed", order_id=oid))
