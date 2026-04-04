"""Gửi email xác nhận đơn hàng (sau khi transaction commit)."""

import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _fmt_vnd(value) -> str:
    if isinstance(value, Decimal):
        return f'{value:,.0f}'.replace(',', '.')
    return str(value)


def send_order_confirmation_email(order_id: int) -> None:
    if not getattr(settings, 'ORDER_CONFIRMATION_EMAIL_ENABLED', True):
        return

    from .models import Order, OrderItem

    try:
        order = (
            Order.objects.select_related('user')
            .get(pk=order_id)
        )
    except Order.DoesNotExist:
        logger.warning('send_order_confirmation_email: Order %s không tồn tại', order_id)
        return

    user = order.user
    to_email = (user.email or '').strip()
    if not to_email:
        logger.info('send_order_confirmation_email: User %s không có email, bỏ qua', user.pk)
        return

    try:
        shipping = order.shipping
    except Exception:
        shipping = None

    item_lines = []
    for item in OrderItem.objects.filter(order=order).select_related(
        'product__product', 'product__color', 'product__size'
    ):
        pv = item.product
        name = pv.product.name
        variant = f'{pv.color.name} / {pv.size.name}'
        unit = _fmt_vnd(item.price)
        item_lines.append(f'- {name} ({variant}) × {item.quantity} — {unit}đ / SP')

    ctx = {
        'username': user.get_username(),
        'order_id': order.id,
        'item_lines': item_lines,
        'items_text': '\n'.join(item_lines),
        'subtotal': _fmt_vnd(order.subtotal),
        'shipping_fee': _fmt_vnd(order.shipping_fee),
        'total': _fmt_vnd(order.total_price),
        'shipping_name': shipping.name if shipping else '',
        'shipping_phone': shipping.phone if shipping else '',
        'shipping_address': shipping.address if shipping else '',
        'shipping_note': (shipping.note or '').strip() if shipping else '',
    }

    try:
        text_body = render_to_string('emails/order_confirmation.txt', ctx)
    except Exception as e:
        logger.exception('Render template order_confirmation: %s', e)
        text_body = (
            f"Xin chào {ctx['username']},\n\n"
            f"Đơn #{order.id} đã được ghi nhận. Tổng: {ctx['total']}đ.\n"
        )

    subject = f'[FashionStore] Xác nhận đơn hàng #{order.id}'

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
    except Exception as e:
        logger.exception('Gửi email xác nhận đơn #%s thất bại: %s', order_id, e)
