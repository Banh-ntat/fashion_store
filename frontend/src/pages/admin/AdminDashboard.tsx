import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { admin, type AdminDashboardStats } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';

const STATUS_VI: Record<string, string> = {
  pending: 'Chờ xử lý',
  shipping: 'Đang giao',
  returing: "Đã hoàn trả",
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

function statsErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err) || !err.response) {
    return 'Không tải được thống kê. Kiểm tra backend đang chạy và đăng nhập lại.';
  }
  const { status, data } = err.response;
  const detail =
    data && typeof data === 'object' && 'detail' in data
      ? (data as { detail?: unknown }).detail
      : undefined;
  const text = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.join(' ') : '';
  if (status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return text || 'Bạn không có quyền xem thống kê (cần vai trò nhân viên hoặc tài khoản staff).';
  if (status >= 500) return 'Lỗi máy chủ khi tải thống kê. Xem log backend.';
  return text || 'Không tải được thống kê.';
}

function formatVnd(value: string | number) {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return String(value);
  return `${new Intl.NumberFormat('vi-VN').format(n)} đ`;
}

function shortVnd(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    admin.dashboard
      .stats()
      .then((res) => setStats(res.data))
      .catch((e) => {
        console.error(e);
        setErr(statsErrorMessage(e));
      })
      .finally(() => setLoading(false));
  }, []);

  const chartRevenueData = useMemo(() => {
    if (!stats?.revenue_series) return [];
    return stats.revenue_series.map((row) => ({
      ...row,
      revenueNum: parseFloat(row.revenue) || 0,
    }));
  }, [stats?.revenue_series]);

  const pieStatusData = useMemo(() => {
    if (!stats?.orders_by_status) return [];
    return Object.entries(stats.orders_by_status)
      .map(([key, value]) => ({
        name: STATUS_VI[key] ?? key,
        value,
        key,
      }))
      .filter((d) => d.value > 0);
  }, [stats?.orders_by_status]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="loading">Đang tải dashboard…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard dashboard--enhanced">
        {err && (
          <div className="admin-banner admin-banner--err" role="alert">
            {err}
          </div>
        )}

        {stats && (
          <>
            <section className="dashboard-kpi" aria-label="Chỉ số nhanh">
              <div className="stats-grid stats-grid--kpi">
                <div className="stat-card stat-card--accent">
                  <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                  <div className="stat-info">
                    <h3>{formatVnd(stats.revenue_today)}</h3>
                    <p>Doanh thu hôm nay</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
                  <div className="stat-info">
                    <h3>{formatVnd(stats.revenue_week)}</h3>
                    <p>Doanh thu 7 ngày</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                  <div className="stat-info">
                    <h3>{formatVnd(stats.revenue_month)}</h3>
                    <p>Doanh thu tháng này</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
                  <div className="stat-info">
                    <h3>{stats.orders_today}</h3>
                    <p>Đơn hôm nay</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
                  <div className="stat-info">
                    <h3>{stats.orders_total}</h3>
                    <p>Tổng đơn hàng</p>
                  </div>
                </div>
                <div className="stat-card stat-card--warn">
                  <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                  <div className="stat-info">
                    <h3>{stats.pending_orders}</h3>
                    <p>Đơn chờ xử lý</p>
                  </div>
                </div>
              </div>
              <div className="dashboard-catalogStrip">
                <span>
                  <strong>{stats.catalog?.products ?? 0}</strong> sản phẩm
                </span>
                <span className="dashboard-catalogStrip-sep">·</span>
                <span>
                  <strong>{stats.catalog?.variants ?? 0}</strong> biến thể
                </span>
                <span className="dashboard-catalogStrip-sep">·</span>
                <span>
                  <strong>{stats.catalog?.categories ?? 0}</strong> danh mục
                </span>
                <Link to="/admin/products" className="dashboard-catalogStrip-link">
                  Quản lý SP →
                </Link>
              </div>
            </section>

            <section className="dashboard-charts" aria-label="Biểu đồ">
              <div className="chart-card chart-card--wide">
                <div className="chart-card-head">
                  <h3>Doanh thu 14 ngày</h3>
                  <span className="chart-card-sub">Không tính đơn đã hủy</span>
                </div>
                <div className="chart-card-body">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={chartRevenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis
                        tickFormatter={(v) => shortVnd(Number(v))}
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                      />
                      <Tooltip
                        formatter={(value) => [formatVnd(Number(value ?? 0)), 'Doanh thu']}
                        labelFormatter={(l) => `Ngày ${l}`}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenueNum"
                        name="Doanh thu"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRev)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card-head">
                  <h3>Đơn theo trạng thái</h3>
                  <span className="chart-card-sub">Tất cả thời gian</span>
                </div>
                <div className="chart-card-body chart-card-body--pie">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name} ${(((percent ?? 0) * 100).toFixed(0))}%`
                        }
                      >
                        {pieStatusData.map((entry, i) => (
                          <Cell key={entry.key} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card-head">
                  <h3>Top sản phẩm theo doanh thu</h3>
                  <span className="chart-card-sub">Từ đơn không hủy</span>
                </div>
                <div className="chart-card-body chart-card-body--table">
                  {stats.top_products && stats.top_products.length > 0 ? (
                    <ul className="dashboard-topProducts">
                      {stats.top_products.map((p, i) => (
                        <li key={`${p.id}-${i}`}>
                          <span className="dashboard-topProducts-rank">{i + 1}</span>
                          <span className="dashboard-topProducts-name" title={p.name}>
                            {p.name}
                          </span>
                          <span className="dashboard-topProducts-rev">{formatVnd(p.revenue)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="dashboard-muted" style={{ margin: 0 }}>
                      Chưa có dữ liệu bán hàng.
                    </p>
                  )}
                </div>
              </div>

              <div className="chart-card chart-card--wide">
                <div className="chart-card-head">
                  <h3>Số đơn theo ngày (14 ngày)</h3>
                </div>
                <div className="chart-card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartRevenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        formatter={(v) => [`${Number(v ?? 0)} đơn`, 'Số đơn']}
                        labelFormatter={(l) => `Ngày ${l}`}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="orders" name="Đơn hàng" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <div className="dashboard-row">
              <div className="dashboard-panel">
                <h3 className="dashboard-panel-title">Cần xử lý</h3>
                <ul className="dashboard-alertList">
                  <li>
                    <Link to="/admin/orders?status=pending">
                      Đơn <strong>pending</strong>: {stats.pending_orders}
                    </Link>
                  </li>
                  {stats.stale_pending_order_ids.length > 0 && (
                    <li className="dashboard-alertList--warn">
                      <span>
                        Đơn pending &gt; 2 ngày: {stats.stale_pending_order_ids.length} — ID:{' '}
                        {stats.stale_pending_order_ids.slice(0, 8).join(', ')}
                        {stats.stale_pending_order_ids.length > 8 ? '…' : ''}
                      </span>
                    </li>
                  )}
                  <li>
                    <Link to="/admin/contacts">
                      Liên hệ chưa xử lý: <strong>{stats.unhandled_contacts}</strong>
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/feedbacks">
                      Góp ý chưa xử lý: <strong>{stats.unhandled_feedbacks}</strong>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="dashboard-panel">
                <h3 className="dashboard-panel-title">Tồn kho &amp; liên kết</h3>
                <p className="dashboard-muted">
                  Biến thể tồn ≤ {stats.low_stock_threshold}:{' '}
                  <strong>{stats.low_stock_variants}</strong> — Sản phẩm có biến thể thấp:{' '}
                  <strong>{stats.low_stock_products}</strong>
                </p>
                <div className="dashboard-quickLinks">
                  <Link to="/admin/products" className="dashboard-quickLink">
                    Sản phẩm
                  </Link>
                  <Link to="/admin/orders" className="dashboard-quickLink">
                    Đơn hàng
                  </Link>
                  <Link to="/admin/policies" className="dashboard-quickLink">
                    Chính sách
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="recent-orders dashboard-hint">
          <h3>Hướng dẫn nhanh</h3>
          <p className="dashboard-muted">
            Dùng sidebar để quản lý sản phẩm, đơn, người dùng và đánh giá. Dashboard tóm tắt doanh thu, đơn hàng và
            việc cần làm; biểu đồ cập nhật theo dữ liệu trong hệ thống.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}