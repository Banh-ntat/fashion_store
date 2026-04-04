import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth, profiles } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types';
import '../styles/pages/Profile.css';

type ProfileWithUser = Omit<Profile, 'user'> & {
  user?: { id: number; username: string; email?: string; first_name?: string; last_name?: string };
  google_id?: string | null;
  facebook_id?: string | null;
  created_at?: string;
};

function roleLabelVi(role: string): string {
  const m: Record<string, string> = {
    customer: 'Khách hàng',
    admin: 'Quản trị viên',
    product_manager: 'Quản lý sản phẩm',
    order_manager: 'Quản lý đơn hàng',
    customer_support: 'Hỗ trợ khách hàng',
  };
  return m[role] ?? role;
}

function formatMemberSince(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseApiFieldErrors(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const parts: string[] = [];
  for (const v of Object.values(data as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(...v.map(String));
    else if (typeof v === 'string') parts.push(v);
  }
  return parts.join(' ') || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function IconOrders() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 3h6l1 2h4v2H4V5h4L9 3zM5 9h14l-1.2 12H6.2L5 9zm4 3v7m4-7v7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCart() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-2 9H8L6 6zm0 0L5 3H2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.25" fill="currentColor" />
      <circle cx="18" cy="20" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16v11H8l-4 4V5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShirt() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8l3-4h6l3 4v14H6V8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 4v3h6V4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h4l1 4-2.5 1.5a12 12 0 0 0 5.5 5.5L16 20l4 1v4h-4C7.5 21 3 12.5 3 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="profileSecurityIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg className="profileQuickIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21V10l8-5 8 5v11M9 21v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '' });

  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    profiles
      .getMe()
      .then((res) => {
        const data = res.data as ProfileWithUser[] | { results?: ProfileWithUser[] };
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const first = list[0] ?? null;
        setProfile(first);
        if (first) {
          setForm({ phone: first.phone ?? '', address: first.address ?? '' });
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await profiles.updateMe(profile.id, form);
      setProfile((p) => (p ? { ...p, ...form } : null));
      setEditing(false);
    } catch {
      alert('Cập nhật thất bại.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);
    if (pwdNew !== pwdConfirm) {
      setPwdFeedback({ ok: false, text: 'Mật khẩu mới và xác nhận không khớp.' });
      return;
    }
    setPwdSubmitting(true);
    try {
      await auth.changePassword(pwdOld, pwdNew, pwdConfirm);
      setPwdFeedback({ ok: true, text: 'Đổi mật khẩu thành công.' });
      setPwdOld('');
      setPwdNew('');
      setPwdConfirm('');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        setPwdFeedback({ ok: false, text: parseApiFieldErrors(err.response.data) });
      } else {
        setPwdFeedback({ ok: false, text: 'Không thể đổi mật khẩu. Vui lòng thử lại.' });
      }
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!authUser) {
    return (
      <section className="pageSection profile-page">
        <div className="profile-hero" aria-hidden>
          <div className="profile-heroMesh" />
        </div>
        <div className="sectionContainer profile-inner">
          <div className="profileLoginCard">
            <h1 className="profileLoginTitle">Tài khoản</h1>
            <p className="profileLoginHint">
              Vui lòng <Link to="/login">đăng nhập</Link> để xem và chỉnh sửa thông tin cá nhân.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection profile-page">
        <div className="profile-hero" aria-hidden>
          <div className="profile-heroMesh" />
        </div>
        <div className="sectionContainer profile-inner">
          <div className="profileSkeleton" aria-busy="true" aria-label="Đang tải">
            <div className="profileSkeleton-title" />
            <div className="profileSkeleton-shell">
              <div className="profileSkeleton-summary">
                <div className="profileSkeleton-summaryRow">
                  <div className="profileSkeleton-avatar profileSkeleton-avatar--lg" />
                  <div className="profileSkeleton-summaryText">
                    <div className="profileSkeleton-line profileSkeleton-line--lg" />
                    <div className="profileSkeleton-line profileSkeleton-line--sm" />
                    <div className="profileSkeleton-line profileSkeleton-line--md" />
                  </div>
                  <div className="profileSkeleton-line profileSkeleton-line--logout" />
                </div>
              </div>
              <div className="profileSkeleton-content">
                <div className="profileSkeleton-mainRow">
                  <div className="profileSkeleton-panel">
                    <div className="profileSkeleton-line profileSkeleton-line--sm" />
                    <div className="profileSkeleton-line profileSkeleton-line--full" />
                    <div className="profileSkeleton-line profileSkeleton-line--full profileSkeleton-line--tall" />
                  </div>
                  <div className="profileSkeleton-panel">
                    <div className="profileSkeleton-line profileSkeleton-line--sm" />
                    <div className="profileSkeleton-line profileSkeleton-line--full" />
                    <div className="profileSkeleton-line profileSkeleton-line--full" />
                    <div className="profileSkeleton-line profileSkeleton-line--btn" />
                  </div>
                </div>
                <div className="profileSkeleton-wide">
                  <div className="profileSkeleton-line profileSkeleton-line--sm" />
                  <div className="profileSkeleton-line profileSkeleton-line--full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const hasProfile = profile != null;
  const accountUsername = profile?.user?.username ?? authUser.username ?? '';
  const u = profile?.user;
  const displayName =
    u?.first_name || u?.last_name
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : accountUsername;
  const showHandleRow = displayName.trim() !== accountUsername.trim();
  const role = profile?.role ?? authUser.role ?? 'customer';
  const memberSince = formatMemberSince(profile?.created_at);
  const linkedGoogle = Boolean(profile?.google_id);
  const linkedFacebook = Boolean(profile?.facebook_id);
  const showAdminEntry = Boolean(authUser.can_access_admin);

  return (
    <section className="pageSection profile-page">
      <div className="profile-hero" aria-hidden>
        <div className="profile-heroMesh" />
      </div>
      <div className="sectionContainer profile-inner">
        <header className="profile-pageHeader profile-pageHeader--standard">
          <h1 className="profileTitle">Tài khoản của tôi</h1>
          <p className="profileSubtitle">
            Xem hồ sơ, cập nhật thông tin giao hàng và bảo mật đăng nhập.
          </p>
        </header>

        <div className="profile-shell">
          <section className="profileCard profile-summary" aria-label="Tóm tắt tài khoản">
            <div className="profileCardAccent" aria-hidden />
            <div className="profile-summaryBody">
              <div className="profile-summaryAvatar">
                <div className="profileAvatarWrap">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="" className="profileAvatar profileAvatar--lg" />
                  ) : (
                    <div className="profileAvatarPlaceholder profileAvatar--lg" aria-hidden>
                      {(profile?.user?.first_name?.[0] ?? authUser.username?.[0] ?? 'U').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="profile-summaryInfo">
                <h2 className="profileName profileName--summary">{displayName}</h2>
                {showHandleRow ? (
                  <p className="profileHandle" title={accountUsername}>
                    @{accountUsername}
                  </p>
                ) : null}
                <p className="profileEmail">{profile?.user?.email ?? authUser.email ?? '—'}</p>
                <div className="profileMeta profileMeta--summary">
                  <span className="profileRoleBadge">{roleLabelVi(role)}</span>
                  {memberSince ? <span className="profileMetaMuted">Tham gia {memberSince}</span> : null}
                </div>
                {(linkedGoogle || linkedFacebook) && (
                  <div className="profileSocialRow profileSocialRow--summary" aria-label="Liên kết đăng nhập">
                    {linkedGoogle && <span className="profileSocialPill">Google</span>}
                    {linkedFacebook && <span className="profileSocialPill">Facebook</span>}
                  </div>
                )}
              </div>
              <div className="profile-summaryActions">
                <button type="button" className="profileBtn profileBtn--logout" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          </section>

          <div className="profile-content">
            <div className="profile-mainTop">
              <div className="profileCard profileCard--secondary profileCard--panel">
                <h3 className="profileSectionTitle profileSectionTitle--panel">Liên hệ &amp; giao hàng</h3>
                {hasProfile ? (
                  <form onSubmit={handleSave} className="profileForm">
                    <label className="profileLabel">
                      <span className="profileLabelText">Số điện thoại</span>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        className={`profileInput ${editing ? 'profileInput--editable' : ''}`}
                        readOnly={!editing}
                        placeholder={editing ? 'Ví dụ: 09xx xxx xxx' : undefined}
                      />
                    </label>
                    <label className="profileLabel">
                      <span className="profileLabelText">Địa chỉ</span>
                      <textarea
                        rows={3}
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        className={`profileInput ${editing ? 'profileInput--editable' : ''}`}
                        readOnly={!editing}
                        placeholder={editing ? 'Số nhà, đường, phường/xã, tỉnh/thành' : undefined}
                      />
                    </label>
                    {editing ? (
                      <div className="profileActions">
                        <button type="submit" className="profileBtn primary">
                          Lưu thay đổi
                        </button>
                        <button
                          type="button"
                          className="profileBtn profileBtn--ghost"
                          onClick={() => setEditing(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="profileBtn primary profileBtn--wide"
                        onClick={() => setEditing(true)}
                      >
                        Chỉnh sửa thông tin
                      </button>
                    )}
                  </form>
                ) : (
                  <p className="profileNoData profileNoData--panel">Chưa có thông tin bổ sung từ hệ thống.</p>
                )}
              </div>

              <div className="profileCard profileCard--secondary profileCard--panel">
                <div className="profileCardHead profileCardHead--panel">
                  <IconShield />
                  <div>
                    <h3 className="profileCardTitle">Bảo mật</h3>
                    <p className="profileCardLead">
                      Đổi mật khẩu định kỳ giúp tài khoản an toàn hơn. Nếu đăng nhập bằng Google hoặc Facebook, bạn vẫn có
                      thể đặt mật khẩu để đăng nhập bằng email.
                    </p>
                  </div>
                </div>
                <form className="profilePasswordForm" onSubmit={handlePasswordSubmit}>
                  <label className="profileLabel">
                    <span className="profileLabelText">Mật khẩu hiện tại</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className="profileInput profileInput--editable"
                      value={pwdOld}
                      onChange={(e) => setPwdOld(e.target.value)}
                      placeholder="••••••••"
                    />
                  </label>
                  <label className="profileLabel">
                    <span className="profileLabelText">Mật khẩu mới (tối thiểu 8 ký tự)</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="profileInput profileInput--editable"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      placeholder="••••••••"
                    />
                  </label>
                  <label className="profileLabel">
                    <span className="profileLabelText">Nhập lại mật khẩu mới</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="profileInput profileInput--editable"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      placeholder="••••••••"
                    />
                  </label>
                  {pwdFeedback ? (
                    <p
                      className={
                        pwdFeedback.ok ? 'profileFeedback profileFeedback--ok' : 'profileFeedback profileFeedback--err'
                      }
                    >
                      {pwdFeedback.text}
                    </p>
                  ) : null}
                  <button type="submit" className="profileBtn primary" disabled={pwdSubmitting}>
                    {pwdSubmitting ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
                  </button>
                </form>
              </div>
            </div>

            <div className="profileCard profileCard--secondary profileCard--flush">
              <h3 className="profileSectionTitle profileSectionTitle--inCard">Truy cập nhanh</h3>
              <div className="profileQuickGrid profileQuickGrid--dense">
                <Link to="/orders" className="profileQuickCard">
                  <IconOrders />
                  <span className="profileQuickCard-text">
                    <span className="profileQuickCard-title">Đơn hàng</span>
                    <span className="profileQuickCard-desc">Lịch sử &amp; trạng thái</span>
                  </span>
                  <span className="profileQuickCard-arrow" aria-hidden>
                    →
                  </span>
                </Link>
                <Link to="/cart" className="profileQuickCard">
                  <IconCart />
                  <span className="profileQuickCard-text">
                    <span className="profileQuickCard-title">Giỏ hàng</span>
                    <span className="profileQuickCard-desc">Sản phẩm đã chọn</span>
                  </span>
                  <span className="profileQuickCard-arrow" aria-hidden>
                    →
                  </span>
                </Link>
                <Link to="/wishlist" className="profileQuickCard">
                  <IconHeart />
                  <span className="profileQuickCard-text">
                    <span className="profileQuickCard-title">Yêu thích</span>
                    <span className="profileQuickCard-desc">Danh sách wishlist</span>
                  </span>
                  <span className="profileQuickCard-arrow" aria-hidden>
                    →
                  </span>
                </Link>
                <Link to="/my-feedback" className="profileQuickCard">
                  <IconChat />
                  <span className="profileQuickCard-text">
                    <span className="profileQuickCard-title">Góp ý của tôi</span>
                    <span className="profileQuickCard-desc">Phản hồi đã gửi</span>
                  </span>
                  <span className="profileQuickCard-arrow" aria-hidden>
                    →
                  </span>
                </Link>
                <Link to="/products" className="profileQuickCard">
                  <IconShirt />
                  <span className="profileQuickCard-text">
                    <span className="profileQuickCard-title">Sản phẩm</span>
                    <span className="profileQuickCard-desc">Xem cửa hàng</span>
                  </span>
                  <span className="profileQuickCard-arrow" aria-hidden>
                    →
                  </span>
                </Link>
                <Link to="/contact" className="profileQuickCard">
                  <IconPhone />
                  <span className="profileQuickCard-text">
                    <span className="profileQuickCard-title">Liên hệ</span>
                    <span className="profileQuickCard-desc">Hỗ trợ &amp; câu hỏi</span>
                  </span>
                  <span className="profileQuickCard-arrow" aria-hidden>
                    →
                  </span>
                </Link>
                {showAdminEntry ? (
                  <Link to="/admin" className="profileQuickCard profileQuickCard--accent">
                    <IconAdmin />
                    <span className="profileQuickCard-text">
                      <span className="profileQuickCard-title">Trang quản trị</span>
                      <span className="profileQuickCard-desc">Dành cho nhân viên</span>
                    </span>
                    <span className="profileQuickCard-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
