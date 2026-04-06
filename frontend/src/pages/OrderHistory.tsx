import { useEffect, useRef, useState } from 'react';
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
    const state = location.state as { orderPlaced?: boolean } | null;
    if (state?.orderPlaced) {
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
          <p className="orderEmpty">
            Bạn chưa có đơn hàng nào. <Link to="/products">Mua sắm</Link>
          </p>
        ) : (
          <ul className="orderList">
            {list.map((order) => (
              <li key={order.id} className="orderCard">
                <div className="orderCardHeader">
                  <span className="orderId">Đơn #{order.id}</span>
                  <span className="orderDate">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : '—'}
                  </span>
                  <span className={`orderStatus orderStatus--${order.status}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                <ul className="orderItems">
                  {order.items?.map((item) => (
                    <li key={item.id} className="orderItem">
                      <div className="orderItemInfo">
                        <span className="orderItemName">{item.product?.name ?? 'Sản phẩm'}</span>
                        {item.variant_info && (
                          <span className="orderItemVariant">
                            <span className="variantColor" style={{ backgroundColor: item.variant_info.color.code }} />
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
                      {order.discount_amount && Number(order.discount_amount) > 0 && (
                        <> · Giảm: {order.discount_amount}đ{order.discount_code ? ` (${order.discount_code})` : ''}</>
                      )}
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
