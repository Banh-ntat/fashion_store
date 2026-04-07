import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cart, orders } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { notifyCartUpdated } from '../utils/cartEvents';
import '../styles/pages/Checkout.css';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/80x100?text=SP';

interface CartItemType {
  id: number;
  product?: { id: number; name: string; price: string; image?: string; promotion?: { discount_percent: number } | null };
  variant_info?: { color: { id: number; name: string; code: string }; size: { id: number; name: string } } | null;
  quantity: number;
}

interface PricingPreview {
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_price: string;
  discount_code: string;
  discount_name: string;
  discount_percent: number;
}

function getUnitPrice(item: CartItemType): number {
  const product = item.product;
  if (!product) return 0;
  let price = parseFloat(String(product.price ?? 0));
  if (product.promotion?.discount_percent) {
    price = price * (1 - product.promotion.discount_percent / 100);
  }
  return price;
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')}₫`;
}

function parseMoney(value: string | number | undefined): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDiscountCode(value: string): string {
  return value.trim().toUpperCase();
}

function parseSelectedCartItemIds(rawValue: string | null): number[] {
  if (!rawValue) return [];
  const ids = rawValue
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  return [...new Set(ids)];
}

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') {
    return data.trim().startsWith('<!DOCTYPE html>') ? fallback : data;
  }
  if (Array.isArray(data)) {
    return typeof data[0] === 'string' ? data[0] : fallback;
  }
  if (typeof data === 'object') {
    if ('detail' in data) {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail) && typeof detail[0] === 'string') return detail[0];
    }
    if ('non_field_errors' in data) {
      const nonFieldErrors = (data as { non_field_errors?: unknown }).non_field_errors;
      if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === 'string') return nonFieldErrors[0];
    }
    const firstValue = Object.values(data as Record<string, unknown>)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
  }
  return fallback;
}

function shouldResetDiscountInput(message: string): boolean {
  const normalized = message.toLocaleLowerCase('vi-VN');
  return normalized.includes('mã giảm giá') || normalized.includes('ma giam gia');
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedIdsFromQuery = parseSelectedCartItemIds(searchParams.get('items'));
  const hasSpecificSelection = selectedIdsFromQuery.length > 0;
  const redirectTo = `${location.pathname}${location.search}` || '/checkout';

  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountMessage, setDiscountMessage] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(null);
  const [step, setStep] = useState<'shipping' | 'confirm'>('shipping');
  const [selectionNotice, setSelectionNotice] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    cart
      .get()
      .then((res) => {
        const data = res.data as { items?: CartItemType[] } | CartItemType[];
        const list = Array.isArray(data)
          ? ((data[0] as { items?: CartItemType[] })?.items ?? [])
          : (data.items ?? []);
        const safeList = Array.isArray(list) ? list : [];

        if (!hasSpecificSelection) {
          setItems(safeList);
          setSelectionNotice('');
          return;
        }

        const filtered = safeList.filter((item) => selectedIdsFromQuery.includes(item.id));
        setItems(filtered);

        if (filtered.length === 0) {
          setSelectionNotice('Các sản phẩm bạn chọn không còn trong giỏ hàng.');
        } else if (filtered.length !== selectedIdsFromQuery.length) {
          setSelectionNotice('Một số sản phẩm đã không còn trong giỏ. Hệ thống chỉ giữ lại các sản phẩm còn hợp lệ.');
        } else {
          setSelectionNotice('');
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [hasSpecificSelection, selectedIdsFromQuery.join(','), user]);

  const selectedCartItemIds = items.map((item) => item.id);
  const subtotal = items.reduce((sum, item) => sum + getUnitPrice(item) * item.quantity, 0);
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const pricing = pricingPreview
    ? {
        subtotal: parseMoney(pricingPreview.subtotal),
        shippingFee: parseMoney(pricingPreview.shipping_fee),
        discountAmount: parseMoney(pricingPreview.discount_amount),
        total: parseMoney(pricingPreview.total_price),
      }
    : {
        subtotal,
        shippingFee,
        discountAmount: 0,
        total: subtotal + shippingFee,
      };

  const appliedDiscountCode = pricingPreview?.discount_code ?? '';
  const hasAppliedDiscount = !!appliedDiscountCode;

  const handleContinueToConfirm = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      alert('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ.');
      return;
    }
    setStep('confirm');
  };

  const handleApplyDiscount = async () => {
    const normalizedCode = normalizeDiscountCode(discountCode);
    if (!normalizedCode) {
      setPricingPreview(null);
      setDiscountMessage('Vui lòng nhập mã giảm giá.');
      return;
    }
    if (selectedCartItemIds.length === 0) {
      setPricingPreview(null);
      setDiscountMessage('Vui lòng chọn sản phẩm trước khi áp dụng mã giảm giá.');
      return;
    }

    setDiscountLoading(true);
    setDiscountMessage('');
    try {
      const res = await orders.discountPreview({
        discount_code: normalizedCode,
        cart_item_ids: selectedCartItemIds,
      });
      setPricingPreview(res.data as PricingPreview);
      setDiscountCode(normalizedCode);
      setDiscountMessage('Áp dụng mã giảm giá thành công.');
    } catch (err) {
      setPricingPreview(null);
      const responseData = (err as { response?: { data?: unknown } })?.response?.data;
      const message = getApiErrorMessage(responseData, 'Không thể áp dụng mã giảm giá.');
      if (shouldResetDiscountInput(message)) {
        setDiscountCode('');
      }
      setDiscountMessage(message);
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleClearDiscount = () => {
    setDiscountCode('');
    setPricingPreview(null);
    setDiscountMessage('');
  };

  const handleSubmit = async () => {
    if (!user || items.length === 0) return;

    const normalizedCode = normalizeDiscountCode(discountCode);
    if (normalizedCode && appliedDiscountCode !== normalizedCode) {
      setDiscountCode('');
      setPricingPreview(null);
      setDiscountMessage('Mã giảm giá chưa được áp dụng. Vui lòng nhập lại nếu vẫn muốn sử dụng.');
      alert('Mã giảm giá chưa được áp dụng. Mã đã được xóa khỏi ô nhập.');
      return;
    }

    setSubmitting(true);
    try {
      await orders.checkout({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        discount_code: appliedDiscountCode || undefined,
        cart_item_ids: selectedCartItemIds,
      });
      setForm({ name: '', phone: '', address: '', note: '' });
      setDiscountCode('');
      setPricingPreview(null);
      setDiscountMessage('');
      notifyCartUpdated();
      navigate('/orders', { state: { orderPlaced: true } });
    } catch (err) {
      const resData = (err as { response?: { data?: unknown } })?.response?.data;
      alert(getApiErrorMessage(resData, 'Đặt hàng thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="pageSection checkout-page">
        <div className="sectionContainer checkout-container">
          <div className="checkout-login-prompt">
            <div className="checkout-login-icon">🔐</div>
            <h2>Vui lòng đăng nhập</h2>
            <p>Bạn cần đăng nhập để tiếp tục thanh toán.</p>
            <div className="checkout-login-actions">
              <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="checkout-btn checkout-btn-primary">
                Đăng nhập
              </Link>
              <Link to="/products" className="checkout-btn checkout-btn-secondary">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection checkout-page">
        <div className="sectionContainer checkout-container">
          <div className="checkout-loading">Đang tải...</div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="pageSection checkout-page">
        <div className="sectionContainer checkout-container">
          <div className="checkout-empty">
            <div className="checkout-empty-icon">🛒</div>
            <h2>Không có sản phẩm để thanh toán</h2>
            <p>{selectionNotice || 'Bạn chưa có sản phẩm nào trong giỏ.'}</p>
            <div className="checkout-login-actions">
              <Link to="/cart" className="checkout-btn checkout-btn-primary">
                Quay lại giỏ hàng
              </Link>
              <Link to="/products" className="checkout-btn checkout-btn-secondary">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pageSection checkout-page">
      <div className="sectionContainer checkout-container">
        <div className="checkout-steps">
          <div className={`checkout-step ${step === 'shipping' ? 'active' : ''} ${step === 'confirm' ? 'completed' : ''}`}>
            <span className="checkout-step-num">{step === 'confirm' ? '✓' : '1'}</span>
            <span className="checkout-step-label">Giao hàng</span>
          </div>
          <div className="checkout-step-line" />
          <div className={`checkout-step ${step === 'confirm' ? 'active' : ''}`}>
            <span className="checkout-step-num">2</span>
            <span className="checkout-step-label">Xác nhận</span>
          </div>
        </div>

        {selectionNotice && <div className="checkout-selection-notice">{selectionNotice}</div>}

        <div className="checkout-layout">
          <div className="checkout-main">
            {step === 'shipping' && (
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 className="checkout-card-title">Thông tin giao hàng</h2>
                </div>
                <form
                  className="checkout-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleContinueToConfirm();
                  }}
                >
                  <div className="checkout-field">
                    <label htmlFor="name">Họ tên người nhận *</label>
                    <input
                      id="name"
                      type="text"
                      className="checkout-input"
                      placeholder="Nguyễn Văn A"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="phone">Số điện thoại *</label>
                    <input
                      id="phone"
                      type="tel"
                      className="checkout-input"
                      placeholder="0912 345 678"
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="address">Địa chỉ nhận hàng *</label>
                    <textarea
                      id="address"
                      className="checkout-input checkout-textarea"
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      rows={3}
                      value={form.address}
                      onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="note">Ghi chú (tùy chọn)</label>
                    <textarea
                      id="note"
                      className="checkout-input checkout-textarea"
                      placeholder="Ghi chú thêm cho đơn hàng..."
                      rows={2}
                      value={form.note}
                      onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    />
                  </div>
                  <button type="submit" className="checkout-btn checkout-btn-primary checkout-btn-full">
                    Tiếp tục
                  </button>
                </form>
              </div>
            )}

            {step === 'confirm' && (
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 className="checkout-card-title">Xác nhận đơn hàng</h2>
                </div>

                <div className="checkout-summary-section">
                  <h3>Thông tin giao hàng</h3>
                  <div className="checkout-info-grid">
                    <div className="checkout-info-item">
                      <span className="checkout-info-label">Người nhận</span>
                      <span>{form.name}</span>
                    </div>
                    <div className="checkout-info-item">
                      <span className="checkout-info-label">Điện thoại</span>
                      <span>{form.phone}</span>
                    </div>
                    <div className="checkout-info-item">
                      <span className="checkout-info-label">Địa chỉ</span>
                      <span>{form.address}</span>
                    </div>
                  </div>
                  <button type="button" className="checkout-edit-btn" onClick={() => setStep('shipping')}>
                    Chỉnh sửa
                  </button>
                </div>

                <div className="checkout-summary-section">
                  <h3>Sản phẩm đã chọn — {items.length} món</h3>
                  <ul className="checkout-product-list">
                    {items.map((item) => {
                      const unitPrice = getUnitPrice(item);
                      const image = item.product?.image || PLACEHOLDER_IMAGE;
                      return (
                        <li key={item.id} className="checkout-product-item">
                          <img src={image} alt="" className="checkout-product-img" />
                          <div className="checkout-product-info">
                            <span className="checkout-product-name">{item.product?.name}</span>
                            {item.variant_info && (
                              <span className="checkout-product-variant">
                                <span className="checkout-variant-color" style={{ backgroundColor: item.variant_info.color.code }} />
                                {item.variant_info.color.name} / {item.variant_info.size.name}
                              </span>
                            )}
                            <span className="checkout-product-qty">× {item.quantity}</span>
                          </div>
                          <span className="checkout-product-price">{formatCurrency(unitPrice * item.quantity)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="checkout-actions">
                  <button
                    type="button"
                    className="checkout-btn checkout-btn-secondary"
                    onClick={() => setStep('shipping')}
                    disabled={submitting}
                  >
                    ← Quay lại
                  </button>
                  <button type="button" className="checkout-btn checkout-btn-primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang xử lý...' : `Đặt hàng — ${formatCurrency(pricing.total)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="checkout-sidebar">
            <div className="checkout-summary-box">
              <h3 className="checkout-summary-title">Tóm tắt đơn hàng</h3>

              <div className="checkout-summary-picked">
                Bạn đang thanh toán <strong>{items.length}</strong> sản phẩm đã chọn từ giỏ hàng.
              </div>

              <div className="checkout-discount-box">
                <label htmlFor="discount-code" className="checkout-discount-label">
                  Mã giảm giá
                </label>
                <div className="checkout-discount-row">
                  <input
                    id="discount-code"
                    type="text"
                    className="checkout-input checkout-discount-input"
                    placeholder="Nhập mã của bạn"
                    value={discountCode}
                    onChange={(event) => {
                      const nextValue = event.target.value.toUpperCase();
                      setDiscountCode(nextValue);
                      if (pricingPreview && normalizeDiscountCode(nextValue) !== appliedDiscountCode) {
                        setPricingPreview(null);
                      }
                      setDiscountMessage('');
                    }}
                  />
                  <button
                    type="button"
                    className="checkout-btn checkout-btn-secondary checkout-discount-apply"
                    onClick={handleApplyDiscount}
                    disabled={discountLoading}
                  >
                    {discountLoading ? 'Đang áp dụng...' : 'Áp dụng'}
                  </button>
                </div>

                {hasAppliedDiscount && (
                  <div className="checkout-discount-meta">
                    <span className="checkout-discount-badge">
                      {appliedDiscountCode}
                      {pricingPreview?.discount_percent ? ` - ${pricingPreview.discount_percent}%` : ''}
                    </span>
                    <button type="button" className="checkout-discount-clear" onClick={handleClearDiscount}>
                      Bỏ mã
                    </button>
                  </div>
                )}

                {discountMessage && (
                  <p className={`checkout-discount-message ${hasAppliedDiscount ? 'is-success' : 'is-error'}`}>
                    {discountMessage}
                  </p>
                )}
              </div>

              <div className="checkout-summary-rows">
                <div className="checkout-summary-row">
                  <span>Tạm tính ({items.length} sản phẩm)</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Phí vận chuyển</span>
                  {pricing.shippingFee === 0 ? (
                    <span className="checkout-free-shipping-badge">Miễn phí</span>
                  ) : (
                    <span>{formatCurrency(pricing.shippingFee)}</span>
                  )}
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="checkout-summary-row checkout-summary-row--discount">
                    <span>Giảm giá{appliedDiscountCode ? ` (${appliedDiscountCode})` : ''}</span>
                    <span>-{formatCurrency(pricing.discountAmount)}</span>
                  </div>
                )}
                {pricing.shippingFee > 0 && (
                  <p className="checkout-free-shipping-hint">Miễn phí vận chuyển cho đơn từ 500.000₫</p>
                )}
                {pricing.shippingFee === 0 && (
                  <div className="checkout-ship-note">
                    <span className="checkout-ship-note-text">
                      Các sản phẩm đã chọn đủ điều kiện miễn phí vận chuyển từ 500.000₫ trở lên.
                    </span>
                  </div>
                )}
              </div>

              <div className="checkout-summary-total">
                <span>Tổng cộng</span>
                <span>{formatCurrency(pricing.total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
