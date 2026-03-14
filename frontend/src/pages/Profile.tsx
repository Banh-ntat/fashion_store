import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { profiles } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types';
import '../styles/pages/Profile.css';

interface ProfileWithUser extends Profile {
  user?: { id: number; username: string; email?: string; first_name?: string; last_name?: string };
}

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<ProfileWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '' });

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

  if (!authUser) {
    return (
      <section className="pageSection profile-page">
        <div className="sectionContainer">
          <p className="profileLoginHint">
            Vui lòng <Link to="/login">đăng nhập</Link> để xem thông tin tài khoản.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pageSection profile-page">
        <div className="sectionContainer">
          <div className="loading">Đang tải...</div>
        </div>
      </section>
    );
  }

  const hasProfile = profile != null;

  return (
    <section className="pageSection profile-page">
      <div className="sectionContainer">
        <h1 className="profileTitle">Thông tin tài khoản</h1>

        <div className="profileCard">
          <div className="profileHeader">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="profileAvatar" />
            ) : (
              <div className="profileAvatarPlaceholder">
                {(profile?.user?.first_name?.[0] ?? authUser.username?.[0] ?? 'U').toUpperCase()}
              </div>
            )}
            <div className="profileUserInfo">
              <h2 className="profileName">
                {profile?.user?.first_name || profile?.user?.last_name
                  ? `${profile.user.first_name ?? ''} ${profile.user.last_name ?? ''}`.trim()
                  : profile?.user?.username ?? authUser.username}
              </h2>
              <p className="profileEmail">{profile?.user?.email ?? authUser.email ?? '—'}</p>
            </div>
          </div>

          {hasProfile ? (
            <form onSubmit={handleSave} className="profileForm">
              <label className="profileLabel">
                Số điện thoại
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="profileInput"
                  readOnly={!editing}
                />
              </label>
              <label className="profileLabel">
                Địa chỉ
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="profileInput"
                  readOnly={!editing}
                />
              </label>
              {editing ? (
                <div className="profileActions">
                  <button type="submit" className="profileBtn primary">Lưu</button>
                  <button type="button" className="profileBtn" onClick={() => setEditing(false)}>
                    Hủy
                  </button>
                </div>
              ) : (
                <button type="button" className="profileBtn primary" onClick={() => setEditing(true)}>
                  Chỉnh sửa
                </button>
              )}
            </form>
          ) : (
            <p className="profileNoData">Chưa có thông tin bổ sung từ hệ thống.</p>
          )}

          <div className="profileLinks">
            <Link to="/orders" className="profileLink">Lịch sử đơn hàng</Link>
            <Link to="/cart" className="profileLink">Giỏ hàng</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
