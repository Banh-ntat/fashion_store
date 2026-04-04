"""Quy tắc giá đơn hàng — đồng bộ với frontend checkout (phí ship tính trên server)."""

from decimal import Decimal, ROUND_HALF_UP

# Miễn phí vận chuyển từ mức này (VNĐ) — khớp frontend Checkout.tsx
FREE_SHIPPING_THRESHOLD_VND = Decimal("500000")
SHIPPING_FEE_VND = Decimal("30000")


def unit_price_vnd(product) -> Decimal:
    """Đơn giá một đơn vị sản phẩm sau khuyến mãi (VNĐ, làm tròn số nguyên)."""
    p = Decimal(product.price)
    if getattr(product, "promotion_id", None):
        d = Decimal(product.promotion.discount_percent)
        p = p * (Decimal(100) - d) / Decimal(100)
    return p.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def shipping_fee_vnd(subtotal: Decimal) -> Decimal:
    if subtotal >= FREE_SHIPPING_THRESHOLD_VND:
        return Decimal("0")
    return SHIPPING_FEE_VND
