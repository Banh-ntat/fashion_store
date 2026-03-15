import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cart } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Cart.css';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/120x160?text=SP';

interface CartProduct {
  id: number;
  name: string;
  price: string;
  old_price?: string | null;
  image?: string;
  promotion?: { discount_percent: number } | null;
}

interface VariantInfo {
  color: { id: number; name: string; code: string };
  size: { id: number; name: string };
}

interface CartItemType {
  id: number;
  product?: CartProduct;
  variant_info?: VariantInfo | null;
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

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchCart = () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    cart
      .get()
      .then((res) => {
        const raw = res.data as { items?: CartItemType[] } | CartItemType[];
        const list = Array.isArray(raw)
          ? (raw[0] as { items?: CartItemType[] })?.items ?? []
          : (raw as { items?: CartItemType[] }).items ?? [];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const handleUpdateQty = async (id: number, newQty: number) => {
    if (newQty < 1) return;
    setUpdatingId(id);
    try {
      await cart.updateItem(id, newQty);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
      );
    } catch (err: unknown) {
      console.error('Update quantity error:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = status === 401 
        ? 'Phiên đăng nhập hết hạn.' 
        : status === 404
        ? 'Không tìm thấy sản phẩm trong giỏ.'
        : 'Không thể cập nhật số lượng. Vui lòng thử lại.';
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await cart.removeItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert('Không thể xóa sản phẩm.');
    }
  };

  const subtotal = items.reduce((sum, it) => sum + getUnitPrice(it) * it.quantity, 0);
  const shippingNote = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingNote;

  if (!user) {
    return (
      <section className="pageSection cart-page">
        <div className="sectionContainer cart-container">
          <h1 className="cart-title">Giỏ hàng</h1>
          <div className="cart-empty cart-login-hint">
            <p>Vui lòng <Link to="/login">đăng nhập</Link> để xem giỏ hàng.</p>
            <Link to="/products" className="cart-btn cart-btn-secondary">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection cart-page">
        <div className="sectionContainer cart-container">
          <h1 className="cart-title">Giỏ hàng</h1>
          <div className="cart-loading">Đang tải giỏ hàng...</div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="pageSection cart-page">
        <div className="sectionContainer cart-container">
          <h1 className="cart-title">Giỏ hàng</h1>
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <p>Giỏ hàng của bạn đang trống.</p>
            <Link to="/products" className="cart-btn cart-btn-primary">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pageSection cart-page">
      <div className="sectionContainer cart-container">
        <h1 className="cart-title">Giỏ hàng</h1>
        <p className="cart-subtitle">
          Bạn đang có <strong>{items.length}</strong> sản phẩm trong giỏ
        </p>

        <div className="cart-layout">
          <div className="cart-list-section">
            <div className="cart-list-header">
              <span className="cart-col-product">Sản phẩm</span>
              <span className="cart-col-price">Đơn giá</span>
              <span className="cart-col-qty">Số lượng</span>
              <span className="cart-col-total">Thành tiền</span>
              <span className="cart-col-action" aria-hidden />
            </div>

            <ul className="cart-items">
              {items.map((item) => {
                const unitPrice = getUnitPrice(item);
                const lineTotal = unitPrice * item.quantity;
                const isUpdating = updatingId === item.id;
                const img = item.product?.image || PLACEHOLDER_IMAGE;
                return (
                  <li key={item.id} className="cart-item">
                    <div className="cart-col-product">
                      <Link to={`/product/${item.product?.id}`} className="cart-item-image-link">
                        <img src={img} alt={item.product?.name ?? ''} />
                      </Link>
                      <div className="cart-item-info">
                        <Link to={`/product/${item.product?.id}`} className="cart-item-name">
                          {item.product?.name}
                        </Link>
                        {item.variant_info && (
                          <div className="cart-item-variant">
                            <span 
                              className="cart-variant-color" 
                              style={{ backgroundColor: item.variant_info.color.code }}
                              title={item.variant_info.color.name}
                            />
                            <span className="cart-variant-name">{item.variant_info.color.name} / {item.variant_info.size.name}</span>
                          </div>
                        )}
                        {item.product?.promotion && (
                          <span className="cart-item-badge">
                            -{item.product.promotion.discount_percent}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="cart-col-price">
                      <span className="cart-unit-price">
                        {unitPrice.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                    <div className="cart-col-qty">
                      <div className="cart-qty-controls">
                        <button
                          type="button"
                          className="cart-qty-btn"
                          disabled={item.quantity <= 1 || isUpdating}
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          aria-label="Giảm số lượng"
                        >
                          −
                        </button>
                        <span className="cart-qty-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          disabled={isUpdating}
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          aria-label="Tăng số lượng"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="cart-col-total">
                      <span className="cart-line-total">
                        {lineTotal.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                    <div className="cart-col-action">
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => handleRemove(item.id)}
                        disabled={isUpdating}
                        aria-label="Xóa sản phẩm"
                      >
                        Xóa
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="cart-continue-row">
              <Link to="/products" className="cart-link-back">
                ← Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          <aside className="cart-summary">
            <div className="cart-summary-box">
              <h3 className="cart-summary-title">Tóm tắt đơn hàng</h3>

              <div className="cart-coupon">
                <label htmlFor="cart-coupon-input">Mã giảm giá</label>
                <div className="cart-coupon-row">
                  <input
                    id="cart-coupon-input"
                    type="text"
                    className="cart-coupon-input"
                    placeholder="Nhập mã"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <button type="button" className="cart-coupon-btn">
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>Tạm tính</span>
                  <span>{subtotal.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="cart-summary-row">
                  <span>Phí vận chuyển</span>
                  <span>
                    {shippingNote === 0
                      ? 'Miễn phí'
                      : `${shippingNote.toLocaleString('vi-VN')}₫`}
                  </span>
                </div>
              </div>

              <div className="cart-summary-total">
                <span>Tổng cộng</span>
                <span>{total.toLocaleString('vi-VN')}₫</span>
              </div>

              <button
                type="button"
                className="cart-btn cart-btn-checkout"
                onClick={() => navigate('/checkout')}
              >
                Thanh toán
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
