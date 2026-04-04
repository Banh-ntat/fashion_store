import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/AuthPages.css';

interface LoginProps {
  onLoginSuccess?: () => void;
}

// OAuth configuration
const GOOGLE_CLIENT_ID = '188966214696-rj8bomspmvc8ocmrb4ss7s6n8dnu7p3m.apps.googleusercontent.com';
const FACEBOOK_APP_ID = '1571626650928827';
const GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';
const FACEBOOK_REDIRECT_URI = 'http://localhost:5173/auth/facebook/callback';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { setUser } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const path = window.location.pathname;

    // Check which OAuth provider based on URL path
    if (code && path.includes('google')) {
      handleGoogleCallback(code);
    } else if (code && path.includes('facebook') && state === 'facebook') {
      handleFacebookCallback(code);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.login(username, password);
      const userData = await auth.getCurrentUser();
      if (userData.role) {
        localStorage.setItem('user_role', userData.role);
      } else {
        localStorage.removeItem('user_role');
      }
      setUser({
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        id: userData.id,
        role: userData.role,
        can_access_admin: userData.can_access_admin,
      });
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate(redirectTo);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage =
        (Array.isArray(ax.response?.data?.detail)
          ? ax.response.data.detail[0]
          : ax.response?.data?.detail) ||
        ax.message ||
        'Tên đăng nhập hoặc mật khẩu không đúng';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
    window.location.href = authUrl;
  };

  const handleGoogleCallback = async (code: string) => {
    setGoogleLoading(true);
    try {
      await auth.googleCallback(code);
      const userData = await auth.getCurrentUser();
      if (userData.role) localStorage.setItem('user_role', userData.role);
      else localStorage.removeItem('user_role');
      setUser({
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        id: userData.id,
        role: userData.role,
        can_access_admin: userData.can_access_admin,
      });
      window.history.replaceState({}, '', '/login');
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate(redirectTo);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = ax.response?.data?.error || ax.message || 'Đăng nhập Google thất bại';
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    // Chỉ dùng public_profile để tránh lỗi "Invalid Scopes: email" (email lấy từ backend nếu có)
    const scope = encodeURIComponent('public_profile');
    // Dùng v21.0 ổn định; redirect_uri phải khớp chính xác với cấu hình trong Facebook App
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=${scope}&response_type=code&state=facebook`;
    window.location.href = authUrl;
  };

  const handleFacebookCallback = async (code: string) => {
    setFacebookLoading(true);
    try {
      await auth.facebookCallback(code);
      const userData = await auth.getCurrentUser();
      if (userData.role) localStorage.setItem('user_role', userData.role);
      else localStorage.removeItem('user_role');
      setUser({
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        id: userData.id,
        role: userData.role,
        can_access_admin: userData.can_access_admin,
      });
      window.history.replaceState({}, '', '/login');
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate(redirectTo);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = ax.response?.data?.error || ax.message || 'Đăng nhập Facebook thất bại';
      setError(errorMessage);
    } finally {
      setFacebookLoading(false);
    }
  };

  const isLoading = loading || googleLoading || facebookLoading;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Chào mừng trở lại</h1>
            <p>Đăng nhập để tiếp tục mua sắm</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="auth-link">
                Đăng ký ngay
              </Link>
            </p>
          </div>

          <div className="auth-divider">
            <span>hoặc</span>
          </div>

          <div className="social-login">
            <button
              type="button"
              className="social-btn google"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <span className="loading-spinner" style={{ borderColor: 'rgba(66, 133, 244, 0.3)', borderTopColor: '#4285F4' }}></span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Tiếp tục với Google
                </>
              )}
            </button>

            <button
              type="button"
              className="social-btn facebook"
              onClick={handleFacebookLogin}
              disabled={facebookLoading}
            >
              {facebookLoading ? (
                <span className="loading-spinner" style={{ borderColor: 'rgba(24, 119, 242, 0.3)', borderTopColor: '#1877F2' }}></span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Tiếp tục với Facebook
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
