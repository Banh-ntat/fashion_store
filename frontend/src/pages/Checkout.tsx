import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

function getUnitPrice(item: CartItemType): number {
  const p = item.product;
  if (!p) return 0;
  let price = parseFloat(String(p.price ?? 0));
  if (p.promotion?.discount_percent) {
    price = price * (1 - p.promotion.discount_percent / 100);
  }
  return price;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/checkout';

  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'shipping' | 'confirm'>('shipping');

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
          ? (data[0] as { items?: CartItemType[] })?.items ?? []
          : (data as { items?: CartItemType[] }).items ?? [];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  const subtotal = items.reduce((sum, it) => sum + getUnitPrice(it) * it.quantity, 0);
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingFee;

  const handleContinueToConfirm = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      alert('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ.');
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!user || items.length === 0) return;
    setSubmitting(true);
    try {
      await orders.checkout({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
      });
      setForm({ name: '', phone: '', address: '', note: '' });
      notifyCartUpdated();
      navigate('/orders', { state: { orderPlaced: true } });
    } catch (err) {
      console.error(err);
      const res = (err as { response?: { data?: { detail?: string | string[] } } })?.response;
      const d = res?.data?.detail;
      const msg = Array.isArray(d) ? d[0] : (d ?? 'Đặt hàng thất bại. Vui lòng thử lại.');
      alert(msg);
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
            <h2>Giỏ hàng trống</h2>
            <p>Bạn chưa có sản phẩm nào trong giỏ.</p>
            <Link to="/products" className="checkout-btn checkout-btn-primary">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pageSection checkout-page">
      <div className="sectionContainer checkout-container">

        {/* Step Indicator */}
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

        <div className="checkout-layout">

          {/* Main Form Area */}
          <div className="checkout-main">
            {step === 'shipping' && (
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 className="checkout-card-title">Thông tin giao hàng</h2>
                </div>
                <form
                  className="checkout-form"
                  onSubmit={(e) => {
                    e.preventDefault();
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
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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

                {/* Shipping info */}
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
                  <button
                    type="button"
                    className="checkout-edit-btn"
                    onClick={() => setStep('shipping')}
                  >
                    Chỉnh sửa
                  </button>
                </div>

                {/* Product list */}
                <div className="checkout-summary-section">
                  <h3>Sản phẩm — {items.length} món</h3>
                  <ul className="checkout-product-list">
                    {items.map((item) => {
                      const unitPrice = getUnitPrice(item);
                      const img = item.product?.image || PLACEHOLDER_IMAGE;
                      return (
                        <li key={item.id} className="checkout-product-item">
                          <img src={img} alt="" className="checkout-product-img" />
                          <div className="checkout-product-info">
                            <span className="checkout-product-name">{item.product?.name}</span>
                            {item.variant_info && (
                              <span className="checkout-product-variant">
                                <span
                                  className="checkout-variant-color"
                                  style={{ backgroundColor: item.variant_info.color.code }}
                                />
                                {item.variant_info.color.name} / {item.variant_info.size.name}
                              </span>
                            )}
                            <span className="checkout-product-qty">× {item.quantity}</span>
                          </div>
                          <span className="checkout-product-price">
                            {(unitPrice * item.quantity).toLocaleString('vi-VN')}₫
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Actions */}
                <div className="checkout-actions">
                  <button
                    type="button"
                    className="checkout-btn checkout-btn-secondary"
                    onClick={() => setStep('shipping')}
                    disabled={submitting}
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="button"
                    className="checkout-btn checkout-btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Đang xử lý...' : `Đặt hàng — ${total.toLocaleString('vi-VN')}₫`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="checkout-sidebar">
            <div className="checkout-summary-box">
              <h3 className="checkout-summary-title">Tóm tắt đơn hàng</h3>

              <div className="checkout-summary-rows">
                <div className="checkout-summary-row">
                  <span>Tạm tính ({items.length} sản phẩm)</span>
                  <span>{subtotal.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Phí vận chuyển</span>
                  {shippingFee === 0 ? (
                    <span className="checkout-free-shipping-badge">Miễn phí</span>
                  ) : (
                    <span>{shippingFee.toLocaleString('vi-VN')}₫</span>
                  )}
                </div>
                {shippingFee > 0 && (
                  <p className="checkout-free-shipping-hint">
                    Miễn phí vận chuyển đơn từ 500.000₫
                  </p>
                )}
                {shippingFee === 0 && (
                  <div className="checkout-ship-note">
                    <span className="checkout-ship-note-text">
                      Đơn hàng đủ điều kiện miễn phí vận chuyển ( từ 500.000₫ trở lên)
                    </span>
                  </div>
                )}
              </div>

              <div className="checkout-summary-total">
                <span>Tổng cộng</span>
                <span>{total.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </section>
  );
}