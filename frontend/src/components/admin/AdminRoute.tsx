import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isStaffRole } from '../../utils/staff';

function canEnterAdmin(user: {
  can_access_admin?: boolean;
  role?: string;
} | null): boolean {
  if (user?.can_access_admin === true) return true;
  if (user?.can_access_admin === false) return false;
  const role = user?.role ?? localStorage.getItem('user_role') ?? undefined;
  return isStaffRole(role);
}

/**
 * Bảo vệ mọi route con /admin: cần đăng nhập + quyền nhân viên (theo API hoặc role).
 */
export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>
        Đang tải…
      </div>
    );
  }

  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  if (!canEnterAdmin(user)) {
    return (
      <div
        className="admin-access-denied"
        style={{
          maxWidth: 520,
          margin: '4rem auto',
          padding: '2rem',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Không có quyền vào trang quản trị</h1>
        <p>
          Tài khoản <strong>{user?.username ?? 'của bạn'}</strong> đang có vai trò{' '}
          <strong>{user?.role ?? 'chưa xác định'}</strong>. Khu vực <code>/admin</code> chỉ dành cho nhân
          viên (admin, quản lý sản phẩm/đơn, hỗ trợ) hoặc tài khoản Django <strong>superuser</strong>.
        </p>
        <p style={{ fontSize: '0.95rem', color: '#64748b' }}>
          Cách xử lý: trong Django Admin hoặc shell, mở <strong>Profile</strong> của user và đổi{' '}
          <code>role</code> thành <code>admin</code> (hoặc role nhân viên khác). Hoặc đăng nhập bằng user
          đã tạo bằng <code>createsuperuser</code>.
        </p>
        <p style={{ marginBottom: 0 }}>
          <Link to="/" style={{ marginRight: 16 }}>
            Về trang chủ
          </Link>
          <Link to="/login?redirect=/admin">Đăng nhập tài khoản khác</Link>
        </p>
      </div>
    );
  }

  return <Outlet />;
}
