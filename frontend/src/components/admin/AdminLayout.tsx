import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../../api/client';
import { useAuth } from '../../context/AuthContext'; // ✅ FIX PATH
import '../../pages/admin/Admin.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/* ================= ICONS ================= */

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const IconProducts = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
);

const IconCategories = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
  </svg>
);

const IconOrders = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <circle cx="9" cy="7" r="4"/>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
  </svg>
);

/* ================= MENU ================= */

type MenuItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

const menuItems: MenuItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <IconDashboard /> },
  { path: '/admin/products', label: 'Sản phẩm', icon: <IconProducts /> },
  { path: '/admin/categories', label: 'Danh mục', icon: <IconCategories /> },
  { path: '/admin/promotions', label: 'Khuyến mãi', icon: <IconCategories /> },
  { path: '/admin/orders', label: 'Đơn hàng', icon: <IconOrders /> },
  { path: '/admin/users', label: 'Người dùng', icon: <IconUsers /> },
];

/* ================= COMPONENT ================= */

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

  const currentTitle =
    menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>

        <nav className="admin-sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="admin-nav-item logout-btn">
            <span className="nav-icon"><IconLogout /></span>
            <span className="nav-label">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{currentTitle}</h1>
          <div className="admin-header-user">
            👤 {user?.username ?? 'Admin'}
            {user?.role ? ` · ${user.role}` : ''}
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}