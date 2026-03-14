import { useState, useEffect } from 'react';
import { admin } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

interface Order {
  id: number;
  user: { id: number; username: string };
  total_price: string;
  status: string;
  created_at: string;
}

const STATUS_CHOICES = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'shipping', label: 'Đang giao hàng' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    admin.orders
      .list()
      .then((res) => {
        const data = res?.data;
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setOrders(list);
      })
      .catch((err) => {
        console.error('Load orders failed:', err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await admin.orders.update(orderId, { status: newStatus });
      loadOrders();
    } catch {
      alert('Có lỗi xảy ra!');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'status-pending',
      shipping: 'status-shipping',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
    };
    return statusMap[status] || '';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_CHOICES.find((s) => s.value === status)?.label || status;
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý đơn hàng</h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.user?.username || 'N/A'}</td>
                <td>${order.total_price}</td>
                <td>
                  <span className={`status-badge ${getStatusBadge(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <select
                    className="status-select"
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    {STATUS_CHOICES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedOrder && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Chi tiết đơn hàng #{selectedOrder.id}</h3>
              <div className="order-details">
                <p><strong>Khách hàng:</strong> {selectedOrder.user?.username}</p>
                <p><strong>Tổng tiền:</strong> ${selectedOrder.total_price}</p>
                <p><strong>Trạng thái:</strong> {getStatusLabel(selectedOrder.status)}</p>
                <p><strong>Ngày tạo:</strong> {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedOrder(null)}>
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
