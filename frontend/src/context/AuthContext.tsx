import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../api/client';

export interface AuthUser {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  id?: number;
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
      .then((data) => {
        setUserState({
          username: data.username ?? 'User',
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          id: data.id,
        });
      })
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
