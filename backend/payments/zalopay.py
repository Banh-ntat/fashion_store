"""ZaloPay Payment Gateway v2 — create order + verify callback (HMAC SHA256)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime
from decimal import Decimal
from typing import Any
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def _hmac_sha256_hex(key: str, raw: str) -> str:
    return hmac.new(key.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()


def _backend_base(request) -> str:
    base = (getattr(settings, "BACKEND_PUBLIC_BASE", None) or "").strip().rstrip("/")
    if base:
        return base
    return request.build_absolute_uri("/").rstrip("/")


def _frontend_orders_url(**params: str) -> str:
    base = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
    q = urlencode(params)
    return f"{base}/orders?{q}" if q else f"{base}/orders"


def build_app_trans_id(order_id: int) -> str:
    """yymmdd_orderId_random — tối đa 40 ký tự (ZaloPay)."""
    prefix = datetime.now(_VN_TZ).strftime("%y%m%d")
    suffix = secrets.token_hex(3)
    raw = f"{prefix}_{order_id}_{suffix}"
    return raw[:40]


def parse_order_id_from_app_trans_id(app_trans_id: str | None) -> int | None:
    s = str(app_trans_id or "").strip()
    parts = s.split("_")
    if len(parts) >= 2 and parts[1].isdigit():
        return int(parts[1])
    return None


def _create_mac_input(
    app_id: int,
    app_trans_id: str,
    app_user: str,
    amount: int,
    app_time: int,
    embed_data: str,
    item: str,
) -> str:
    return "|".join(
        (
            str(app_id),
            str(app_trans_id),
            str(app_user),
            str(amount),
            str(app_time),
            str(embed_data),
            str(item),
        )
    )


def create_payment(
    request,
    order_id: int,
    amount_vnd: Decimal,
    description: str,
    app_user: str,
) -> str:
    """
    Gọi POST /v2/create, trả order_url để chuyển hướng khách sang cổng ZaloPay.
    """
    raw_app_id = (getattr(settings, "ZALOPAY_APP_ID", None) or "").strip()
    key1 = (getattr(settings, "ZALOPAY_KEY1", None) or "").strip()
    if not raw_app_id or not key1:
        raise ValueError("ZaloPay chưa cấu hình (ZALOPAY_APP_ID, ZALOPAY_KEY1).")

    try:
        app_id = int(raw_app_id)
    except ValueError as exc:
        raise ValueError("ZALOPAY_APP_ID không hợp lệ.") from exc

    endpoint = (getattr(settings, "ZALOPAY_CREATE_ENDPOINT", None) or "").strip() or (
        "https://sb-openapi.zalopay.vn/v2/create"
    )
    callback_path = getattr(settings, "ZALOPAY_CALLBACK_PATH", "/api/payments/zalopay/callback/").strip()
    if callback_path.startswith("http"):
        callback_url = callback_path
    else:
        if not callback_path.startswith("/"):
            callback_path = "/" + callback_path
        base = _backend_base(request)
        callback_url = f"{base}{callback_path}"

    app_trans_id = build_app_trans_id(order_id)
    app_time = int(datetime.now(_VN_TZ).timestamp() * 1000)
    amount = int(amount_vnd.quantize(Decimal("1")))
    au = (app_user or "guest").strip()[:50] or "guest"
    desc = (description or f"Thanh toan don hang #{order_id}")[:256]
    redirect = _frontend_orders_url(payment="pending", order_id=str(order_id))
    # VietQR / QR đa năng trên cổng; QR trên site vẫn mã hóa order_url (tài liệu POS QR động).
    embed_data = json.dumps(
        {"redirecturl": redirect, "preferred_payment_method": ["vietqr"]},
        separators=(",", ":"),
    )
    item = "[]"

    mac = _hmac_sha256_hex(key1, _create_mac_input(app_id, app_trans_id, au, amount, app_time, embed_data, item))

    payload: dict[str, Any] = {
        "app_id": app_id,
        "app_user": au,
        "app_time": app_time,
        "amount": amount,
        "app_trans_id": app_trans_id,
        "embed_data": embed_data,
        "item": item,
        "description": desc,
        "bank_code": "",
        "callback_url": callback_url,
        "mac": mac,
    }

    try:
        r = requests.post(endpoint, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
        r.raise_for_status()
        body = r.json()
    except (requests.RequestException, ValueError) as e:
        logger.exception("ZaloPay create failed: %s", e)
        raise ValueError("Không kết nối được ZaloPay.") from e

    if int(body.get("return_code", -1)) != 1:
        msg = body.get("return_message") or body.get("sub_return_message") or "ZaloPay từ chối tạo đơn"
        raise ValueError(str(msg))

    order_url = body.get("order_url")
    if not order_url:
        raise ValueError("ZaloPay không trả order_url.")
    return str(order_url)


def verify_callback_mac(data_str: str, received_mac: str) -> bool:
    key2 = (getattr(settings, "ZALOPAY_KEY2", None) or "").strip()
    if not key2 or not data_str or not received_mac:
        return False
    expected = _hmac_sha256_hex(key2, data_str)
    return hmac.compare_digest(expected, received_mac.strip())


def parse_callback_payload(data_str: str) -> dict[str, Any]:
    return json.loads(data_str)


def callback_inner_get(inner: dict[str, Any], *keys: str) -> Any:
    for k in keys:
        if k in inner and inner[k] is not None:
            return inner[k]
    return None
