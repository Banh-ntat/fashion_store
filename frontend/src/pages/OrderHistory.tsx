import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { orders } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';
import '../styles/pages/OrderHistory.css';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
};

export default function OrderHistory() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const clearedPlacedState = useRef(false);
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderPlacedBanner, setShowOrderPlacedBanner] = useState(false);

  useEffect(() => {
    if (clearedPlacedState.current) return;
    const st = location.state as { orderPlaced?: boolean } | null;
    if (st?.orderPlaced) {
      clearedPlacedState.current = true;
      setShowOrderPlacedBanner(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    orders
      .list()
      .then((res) => {
        const data = res.data as Order[] | { results?: Order[] };
        setList(Array.isArray(data) ? data : (data.results ?? []));
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <section className="pageSection order-history-page">
        <div className="sectionContainer">
          <p className="orderLoginHint">
            Vui lòng <Link to="/login">đăng nhập</Link> để xem lịch sử đơn hàng.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection order-history-page">
        <div className="sectionContainer">
          <div className="loading">Đang tải...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="pageSection order-history-page">
      <div className="sectionContainer">
        <h1 className="orderHistoryTitle">Lịch sử đơn hàng</h1>

        {showOrderPlacedBanner && (
          <div className="orderPlacedBanner" role="status">
            Đặt hàng thành công. Cảm ơn bạn đã mua sắm tại cửa hàng.
          </div>
        )}

        {list.length === 0 ? (
          <div className="orderEmpty">
            <div className="orderEmptyIconWrap">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="16" x2="13" y2="16"/>
              </svg>
            </div>
            <h2>Lịch sử trống</h2>
            <p>Hãy khám phá sản phẩm và mua sắm ngay!</p>
            <Link to="/products" className="orderEmptyBtn">Mua sắm ngay</Link>
          </div>
        ) : (
          <ul className="orderList">
            {list.map((order) => (
              <li key={order.id} className="orderCard">
                <div className="orderCardHeader">
                  <span className="orderId">Đơn #{order.id}</span>
                  <span className="orderDate">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString('vi-VN')
                      : '—'}
                  </span>
                  <span className={`orderStatus orderStatus--${order.status}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
                <ul className="orderItems">
                  {order.items?.map((item) => (
                    <li key={item.id} className="orderItem">
                      <div className="orderItemInfo">
                        <span className="orderItemName">
                          {item.product?.name ?? 'Sản phẩm'}
                        </span>
                        {item.variant_info && (
                          <span className="orderItemVariant">
                            <span
                              className="variantColor"
                              style={{ backgroundColor: item.variant_info.color.code }}
                            />
                            {item.variant_info.color.name} / {item.variant_info.size.name}
                          </span>
                        )}
                      </div>
                      <span className="orderItemQty">x{item.quantity}</span>
                      <span className="orderItemPrice">{item.price}đ</span>
                    </li>
                  ))}
                </ul>
                <div className="orderTotal">
                  {order.subtotal != null && order.shipping_fee != null && (
                    <div className="orderTotalBreakdown">
                      Tạm tính: {order.subtotal}đ · Phí ship: {order.shipping_fee}đ
                    </div>
                  )}
                  Tổng: <strong>{order.total_price}đ</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}