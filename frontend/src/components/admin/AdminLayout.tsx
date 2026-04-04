import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import '../../pages/admin/Admin.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

type MenuItem = {
  path: string;
  label: string;
  icon: string;
};

const menuItems: MenuItem[] = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/products', label: 'Sản phẩm', icon: '📦' },
  { path: '/admin/categories', label: 'Danh mục', icon: '🏷️' },
  { path: '/admin/promotions', label: 'Khuyến mãi', icon: '🏷️' },
  { path: '/admin/orders', label: 'Đơn hàng', icon: '📋' },
  { path: '/admin/users', label: 'Người dùng', icon: '👥' },
  { path: '/admin/reviews', label: 'Đánh giá', icon: '⭐' },
  { path: '/admin/contacts', label: 'Liên hệ', icon: '📧' },
  { path: '/admin/feedbacks', label: 'Góp ý', icon: '💬' },
  { path: '/admin/policies', label: 'Chính sách', icon: '📜' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    auth.logout();
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🛠️ Admin Panel</h2>
        </div>
        <nav className="admin-sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-item">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Về trang chủ</span>
          </Link>
          <button onClick={handleLogout} className="admin-nav-item logout-btn">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Đăng xuất</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </h1>
          <div className="admin-header-user">
            <span>
              👤 {user?.username ?? 'Admin'}
              {user?.role ? ` · ${user.role}` : ''}
            </span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
