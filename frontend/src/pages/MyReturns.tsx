import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orders, returns } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';
import '../styles/pages/MyReturns.css';

const REASON_OPTIONS = [
  { value: 'wrong_item', label: 'Sản phẩm sai' },
  { value: 'damaged', label: 'Sản phẩm hỏng/lỗi' },
  { value: 'not_as_described', label: 'Không đúng mô tả' },
  { value: 'changed_mind', label: 'Thay đổi quyết định' },
  { value: 'other', label: 'Lý do khác' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  completed: 'Hoàn thành',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'return-status--pending',
  approved: 'return-status--approved',
  rejected: 'return-status--rejected',
  completed: 'return-status--completed',
};

interface ReturnOrderItem {
  id: number;
  product?: { name: string; image?: string };
  variant_info?: { color: { name: string; code: string }; size: { name: string } } | null;
  quantity: number;
  price: string;
}

interface ReturnRequest {
  id: number;
  order: number;
  reason: string;
  description: string;
  status: string;
  admin_note: string;
  order_total: string;
  order_items: ReturnOrderItem[];
  created_at: string;
}

export default function MyReturns() {
  const { user } = useAuth();
  const [returnList, setReturnList] = useState<ReturnRequest[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [form, setForm] = useState({ order: '', reason: '', description: '' });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([returns.list(), orders.list()])
      .then(([returnRes, ordersRes]) => {
        const returnData = returnRes.data as ReturnRequest[] | { results?: ReturnRequest[] };
        setReturnList(Array.isArray(returnData) ? returnData : (returnData.results ?? []));
        const orderData = ordersRes.data as Order[] | { results?: Order[] };
        const allOrders = Array.isArray(orderData) ? orderData : (orderData.results ?? []);
        setCompletedOrders(allOrders.filter((o) => o.status === 'completed'));
      })
      .catch(() => { setReturnList([]); setCompletedOrders([]); })
      .finally(() => setLoading(false));
  }, [user]);

  const alreadyRequestedOrderIds = new Set(returnList.map((r) => r.order));
  const eligibleOrders = completedOrders.filter((o) => !alreadyRequestedOrderIds.has(o.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!form.order || !form.reason) { setFormError('Vui lòng chọn đơn hàng và lý do.'); return; }
    setSubmitting(true);
    try {
      const res = await returns.create({
        order: Number(form.order),
        reason: form.reason,
        description: form.description,
      });
      setReturnList((prev) => [res.data as ReturnRequest, ...prev]);
      setCompletedOrders((prev) => prev.filter((o) => o.id !== Number(form.order)));
      setForm({ order: '', reason: '', description: '' });
      setShowForm(false);
      setFormSuccess('Gửi yêu cầu thành công. Chúng tôi sẽ xem xét và phản hồi sớm.');
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(detail ?? 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="pageSection my-returns-page">
        <div className="sectionContainer">
          <p className="returns-login-hint">
            Vui lòng <Link to="/login">đăng nhập</Link> để xem yêu cầu trả hàng.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection my-returns-page">
        <div className="sectionContainer"><div className="loading">Đang tải...</div></div>
      </section>
    );
  }

  return (
    <section className="pageSection my-returns-page">
      <div className="sectionContainer">
        <div className="returns-header">
          <div>
            <h1 className="returns-title">Yêu cầu trả hàng & hoàn tiền</h1>
            <p className="returns-subtitle">
              Chỉ áp dụng cho đơn hàng đã hoàn thành. Chúng tôi sẽ xem xét trong 1–3 ngày làm việc.
            </p>
          </div>
          {eligibleOrders.length > 0 && (
            <button
              type="button"
              className="returns-new-btn"
              onClick={() => { setShowForm((v) => !v); setFormError(''); setFormSuccess(''); }}
            >
              {showForm ? 'Đóng' : '+ Gửi yêu cầu mới'}
            </button>
          )}
        </div>

        {formSuccess && (
          <div className="returns-success" role="status">{formSuccess}</div>
        )}

        {showForm && (
          <div className="returns-form-card">
            <h2 className="returns-form-title">Thông tin yêu cầu trả hàng</h2>
            <form onSubmit={handleSubmit} className="returns-form">
              <div className="returns-field">
                <label htmlFor="return-order">Đơn hàng *</label>
                <select
                  id="return-order"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  required
                >
                  <option value="">Chọn đơn hàng</option>
                  {eligibleOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      Đơn #{o.id} — {o.total_price}đ — {new Date(o.created_at).toLocaleDateString('vi-VN')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="returns-field">
                <label htmlFor="return-reason">Lý do *</label>
                <select
                  id="return-reason"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  required
                >
                  <option value="">Chọn lý do</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="returns-field">
                <label htmlFor="return-desc">Mô tả chi tiết (tuỳ chọn)</label>
                <textarea
                  id="return-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả thêm về vấn đề của bạn..."
                  maxLength={1000}
                />
              </div>
              {formError && <p className="returns-form-error" role="alert">{formError}</p>}
              <div className="returns-form-actions">
                <button type="submit" className="returns-submit-btn" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
                <button type="button" className="returns-cancel-btn" onClick={() => setShowForm(false)}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {returnList.length === 0 ? (
          <div className="returns-empty">
            <p>Bạn chưa có yêu cầu trả hàng nào.</p>
            {eligibleOrders.length === 0 && completedOrders.length === 0 && (
              <Link to="/orders" className="returns-link">Xem lịch sử đơn hàng</Link>
            )}
          </div>
        ) : (
          <ul className="returns-list">
            {returnList.map((r) => (
              <li key={r.id} className="returns-card">
                <div className="returns-card-header">
                  <span className="returns-card-id">Yêu cầu #{r.id}</span>
                  <span className="returns-card-order">Đơn #{r.order}</span>
                  <span className={`return-status ${STATUS_CLASS[r.status] ?? ''}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <div className="returns-card-body">
                  <p className="returns-card-reason">
                    <span className="returns-label">Lý do:</span>{' '}
                    {REASON_OPTIONS.find((o) => o.value === r.reason)?.label ?? r.reason}
                  </p>
                  {r.description && (
                    <p className="returns-card-desc">
                      <span className="returns-label">Mô tả:</span> {r.description}
                    </p>
                  )}
                  {r.order_items && r.order_items.length > 0 && (
                    <div className="returns-items">
                      <p className="returns-label returns-items-title">Sản phẩm trong đơn:</p>
                      <ul className="returns-items-list">
                        {r.order_items.map((item) => (
                          <li key={item.id} className="returns-item-row">
                            <span className="returns-item-name">{item.product?.name ?? 'Sản phẩm'}</span>
                            {item.variant_info && (
                              <span className="returns-item-variant">
                                <span className="returns-item-color-dot" style={{ backgroundColor: item.variant_info.color.code }} />
                                {item.variant_info.color.name} / {item.variant_info.size.name}
                              </span>
                            )}
                            <span className="returns-item-qty">x{item.quantity}</span>
                            <span className="returns-item-price">{Number(item.price).toLocaleString('vi-VN')}đ</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.admin_note && (
                    <p className="returns-card-admin-note">
                      <span className="returns-label">Phản hồi từ cửa hàng:</span> {r.admin_note}
                    </p>
                  )}
                  <p className="returns-card-date">
                    Gửi lúc: {new Date(r.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}