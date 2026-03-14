import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cart, orders } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Checkout.css';

interface CartItemType {
  id: number;
  product?: { id: number; name: string; price: string };
  quantity: number;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    cart
      .get()
      .then((res) => {
        const data = res.data as { items?: CartItemType[] } | CartItemType[];
        const list = Array.isArray(data) ? (data[0] as { items?: CartItemType[] })?.items ?? [] : (data.items ?? []);
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  const total = items.reduce((sum, it) => {
    const p = Number(it.product?.price ?? 0);
    return sum + p * it.quantity;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setSubmitting(true);
    try {
      await orders.create({
        total_price: total.toFixed(0),
      });
      setForm({ name: '', phone: '', address: '' });
      navigate('/orders');
    } catch (err) {
      console.error(err);
      alert('Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="pageSection checkout-page">
        <div className="sectionContainer">
          <p className="checkoutLoginHint">
            Vui lòng <Link to="/login">đăng nhập</Link> để thanh toán.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection checkout-page">
        <div className="sectionContainer">
          <div className="loading">Đang tải...</div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="pageSection checkout-page">
        <div className="sectionContainer">
          <p className="checkoutEmpty">
            Giỏ hàng trống. <Link to="/products">Mua sắm</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="pageSection checkout-page">
      <div className="sectionContainer">
        <h1 className="checkoutTitle">Thanh toán</h1>

        <form className="checkoutForm" onSubmit={handleSubmit}>
          <div className="checkoutMain">
            <div className="checkoutSection">
              <h2 className="checkoutSectionTitle">Thông tin giao hàng</h2>
              <label className="checkoutLabel">
                Họ tên
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="checkoutInput"
                />
              </label>
              <label className="checkoutLabel">
                Số điện thoại
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="checkoutInput"
                />
              </label>
              <label className="checkoutLabel">
                Địa chỉ
                <textarea
                  required
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="checkoutInput"
                />
              </label>
            </div>

            <div className="checkoutSummary">
              <h2 className="checkoutSectionTitle">Đơn hàng</h2>
              <ul className="checkoutItems">
                {items.map((it) => (
                  <li key={it.id} className="checkoutItem">
                    <span className="checkoutItemName">{it.product?.name ?? 'Sản phẩm'}</span>
                    <span className="checkoutItemQty">x{it.quantity}</span>
                    <span className="checkoutItemPrice">
                      {Number(it.product?.price ?? 0) * it.quantity}đ
                    </span>
                  </li>
                ))}
              </ul>
              <div className="checkoutTotal">
                <span>Tổng cộng</span>
                <strong>{total.toFixed(0)}đ</strong>
              </div>
              <button type="submit" className="checkoutSubmit" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
