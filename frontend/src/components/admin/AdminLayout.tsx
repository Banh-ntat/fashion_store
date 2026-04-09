import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../pages/admin/Admin.css";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const IconBox = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

const IconList = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconShoppingBag = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <circle cx="9" cy="7" r="4" />
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconStar = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconMessageSquare = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconRefreshCcw = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <polyline points="1 4 1 10 7 10" />
    <polyline points="23 20 23 14 17 14" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);

const IconPercent = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" className="icon">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

type MenuItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  /** Chỉ hiện khi user là admin (gán vai trò) */
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { path: "/admin", label: "Dashboard", icon: <IconDashboard /> },
  { path: "/admin/products", label: "Sản phẩm", icon: <IconBox /> },
  { path: "/admin/categories", label: "Danh mục", icon: <IconList /> },
  { path: "/admin/promotions", label: "Khuyến mãi", icon: <IconPercent /> },
  { path: "/admin/orders", label: "Đơn hàng", icon: <IconShoppingBag /> },
  { path: "/admin/returns", label: "Trả hàng", icon: <IconRefreshCcw /> },
  {
    path: "/admin/users",
    label: "Người dùng",
    icon: <IconUsers />,
    adminOnly: true,
  },
  { path: "/admin/reviews", label: "Đánh giá", icon: <IconStar /> },
  { path: "/admin/contacts", label: "Liên hệ", icon: <IconMail /> },
  { path: "/admin/feedbacks", label: "Góp ý", icon: <IconMessageSquare /> },
  { path: "/admin/policies", label: "Chính sách", icon: <IconFileText /> },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>

        <nav className="admin-sidebar-nav">
          {menuItems
            .filter((item) => !item.adminOnly || user?.is_admin)
            .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `admin-nav-item${isActive ? " active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={handleLogout}
            className="admin-nav-item logout-btn"
          >
            <span className="nav-icon">
              <IconLogout />
            </span>
            <span className="nav-label">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Quản trị</h1>
          <div className="admin-header-right">
            <div className="admin-header-actions">
              <Link to="/" className="admin-header-action-link admin-header-action-link--primary">
                Về trang chủ
              </Link>
              <Link to="/products" className="admin-header-action-link">
                Xem cửa hàng
              </Link>
            </div>
            <div className="admin-header-user">
              {user?.username ?? "Admin"}
              {user?.role ? ` · ${user.role}` : ""}
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
