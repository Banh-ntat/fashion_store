import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../api/client';

export interface AuthUser {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  id?: number;
  /** Role từ Profile (backend) — dùng cho /admin */
  role?: string;
  /** Khớp backend `is_staff` + superuser — ưu tiên dùng thay vì chỉ đoán từ role */
  can_access_admin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    localStorage.removeItem('user_role');
    setUserState(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    auth
      .getCurrentUser()
      .then(
        (data: {
          username?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          id?: number;
          role?: string;
          can_access_admin?: boolean;
        }) => {
          if (data.role) {
            localStorage.setItem('user_role', data.role);
          } else {
            localStorage.removeItem('user_role');
          }
          setUserState({
            username: data.username ?? 'User',
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            id: data.id,
            role: data.role,
            can_access_admin: data.can_access_admin,
          });
        }
      )
      .catch(() => {
        auth.logout();
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, [setUserState]);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
