import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../api/client';
import '../styles/pages/AuthPages.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Địa chỉ email không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      await auth.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="forgot-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1>Quên mật khẩu?</h1>
            <p>Nhập địa chỉ email của bạn để nhận liên kết đặt lại mật khẩu</p>
          </div>

          {success ? (
            <div className="auth-success">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2>Kiểm tra email của bạn!</h2>
              <p>Chúng tôi đã gửi liên kết đặt lại mật khẩu đến {email}</p>
              <Link to="/login" className="auth-submit-btn" style={{ marginTop: '20px', display: 'inline-block', textAlign: 'center' }}>
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  required
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  'Gửi liên kết đặt lại'
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              Nhớ mật khẩu?{' '}
              <Link to="/login" className="auth-link">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
