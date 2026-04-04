import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cart } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { notifyCartUpdated } from '../utils/cartEvents';
import '../styles/pages/Cart.css';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/120x160?text=SP';

interface CartProduct {
  id: number;
  name: string;
  price: string;
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
  /** Tồn kho variant (từ API) */
  stock?: number;
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
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchCart = () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    cart.get()
      .then((res) => {
        const raw = res.data as any;
        const list = Array.isArray(raw)
          ? raw[0]?.items ?? []
          : raw.items ?? [];
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => {
        setLoading(false);
        notifyCartUpdated();
      });
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const handleUpdateQty = async (id: number, newQty: number) => {
    if (newQty < 1) return;
    const item = items.find((i) => i.id === id);
    if (item?.stock != null && newQty > item.stock) {
      alert(`Chỉ còn ${item.stock} sản phẩm trong kho.`);
      return;
    }
    setUpdatingId(id);
    try {
      await cart.updateItem(id, newQty);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
      );
      notifyCartUpdated();
    } catch (err) {
      const res = (err as { response?: { data?: { quantity?: string[]; detail?: string } } })?.response;
      const q = res?.data?.quantity;
      const msg = Array.isArray(q) ? q[0] : (res?.data as { detail?: string })?.detail ?? 'Không thể cập nhật số lượng.';
      alert(typeof msg === 'string' ? msg : 'Không thể cập nhật số lượng.');
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (id: number) => {
    await cart.removeItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    notifyCartUpdated();
  };

  const subtotal = items.reduce((sum, it) => sum + getUnitPrice(it) * it.quantity, 0);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  if (!user) {
    return (
      <div className="cart-empty">
        <span className="cart-empty-icon">🔐</span>
        <h2>Chưa đăng nhập</h2>
        <p>Vui lòng đăng nhập để xem giỏ hàng của bạn</p>
        <div className="cart-empty-actions">
          <Link to="/login" className="cart-btn-primary">Đăng nhập</Link>
          <Link to="/products" className="cart-btn-secondary">Mua sắm</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="cart-loading">Đang tải...</div>;
  }

if (items.length === 0) {
  return (
    <section className="pageSection">
      <div className="sectionContainer">
        <h1 className="cart-title">Giỏ hàng</h1>

        <div className="cart-empty">
          <span className="cart-empty-icon">🛒</span>
          <h2>Giỏ hàng trống</h2>
          <p>Bạn chưa thêm sản phẩm nào vào giỏ hàng</p>

          <Link to="/products" className="cart-btn-primary">
            Mua ngay
          </Link>
        </div>
      </div>
    </section>
  );
}

  return (
    <section className="cart-container">
      <h1 className="cart-title">Giỏ hàng</h1>

      <div className="cart-layout">
        {/* LIST */}
        <div className="cart-list">
          {items.map((item) => {
            const price = getUnitPrice(item);
            const totalItem = price * item.quantity;

            return (
              <div key={item.id} className="cart-item">
                <img src={item.product?.image || PLACEHOLDER_IMAGE} />

                <div className="cart-info">
                  <h3>{item.product?.name}</h3>

                  {item.variant_info && (
                    <span className="variant">
                      {item.variant_info.color.name} / {item.variant_info.size.name}
                    </span>
                  )}

                  {item.product?.promotion && (
                    <span className="badge">
                      -{item.product.promotion.discount_percent}%
                    </span>
                  )}
                </div>

                <div className="price">{price.toLocaleString()}₫</div>

                <div className="qty">
                  <button onClick={() => handleUpdateQty(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.stock != null && item.quantity >= item.stock}
                    title={item.stock != null ? `Tối đa ${item.stock}` : undefined}
                    onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <div className="total">{totalItem.toLocaleString()}₫</div>

                <button className="remove" onClick={() => handleRemove(item.id)}>
                  Xóa
                </button>
              </div>
            );
          })}
        </div>

        {/* SUMMARY */}
        <div className="cart-summary">
          <h3>Tóm tắt đơn hàng</h3>

          {shipping === 0 && (
            <div className="free-ship"> Miễn phí vận chuyển</div>
          )}

          <div className="row">
            <span>Tạm tính</span>
            <span>{subtotal.toLocaleString()}₫</span>
          </div>

          <div className="row">
            <span>Phí vận chuyển</span>
            <span>{shipping === 0 ? 'Free' : shipping.toLocaleString() + '₫'}</span>
          </div>

          <div className="total-final">
            {total.toLocaleString()}₫
          </div>

          <button className="checkout" onClick={() => navigate('/checkout')}>
            Thanh toán
          </button>
        </div>
      </div>
    </section>
  );
}