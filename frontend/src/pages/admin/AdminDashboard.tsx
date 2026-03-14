import { useState, useEffect } from 'react';
import { admin } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  pendingOrders: number;
}

interface RecentOrder {
  id: number;
  user: { username: string };
  total_price: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      admin.products.list(),
      admin.orders.list(),
      admin.users.list(),
    ])
      .then(([productsRes, ordersRes, usersRes]) => {
        const toList = (d: unknown) => (Array.isArray(d) ? d : Array.isArray((d as { results?: unknown[] })?.results) ? (d as { results: unknown[] }).results : []);
        const orders = toList(ordersRes?.data) as RecentOrder[];
        const productsList = toList(productsRes?.data);
        const usersList = toList(usersRes?.data);
        setStats({
          totalProducts: productsList.length,
          totalOrders: orders.length,
          totalUsers: usersList.length,
          pendingOrders: orders.filter((o: RecentOrder) => o.status === 'pending').length,
        });
        setRecentOrders(orders.slice(0, 5));
      })
      .catch((err) => {
        console.error('Dashboard load failed:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'status-pending',
      shipping: 'status-shipping',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
    };
    return statusMap[status] || '';
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="dashboard">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>{stats.totalProducts}</h3>
              <p>Tổng sản phẩm</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <h3>{stats.totalOrders}</h3>
              <p>Tổng đơn hàng</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{stats.totalUsers}</h3>
              <p>Tổng người dùng</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>{stats.pendingOrders}</h3>
              <p>Đơn chờ xử lý</p>
            </div>
          </div>
        </div>

        <div className="recent-orders">
          <h3>Đơn hàng gần đây</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user?.username || 'N/A'}</td>
                  <td>${order.total_price}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
