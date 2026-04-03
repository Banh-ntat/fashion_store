import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const getKey = (userId: number | string) => `fashion_store_wishlist_${userId}`;

function getStoredIds(userId: number | string): number[] {
  try {
    const raw = localStorage.getItem(getKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is number => typeof x === 'number')
      : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const { user } = useAuth();

  const [ids, setIds] = useState<number[]>(() =>
    user?.id != null ? getStoredIds(user.id) : []
  );

  // Khi đổi tài khoản → load đúng wishlist của user đó
  useEffect(() => {
    setIds(user?.id != null ? getStoredIds(user.id) : []);
  }, [user?.id]);

  // Lưu vào localStorage mỗi khi ids thay đổi
  useEffect(() => {
    if (user?.id == null) return;
    localStorage.setItem(getKey(user.id), JSON.stringify(ids));
  }, [ids, user?.id]);

  const add = useCallback((productId: number) => {
    setIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  }, []);

  const remove = useCallback((productId: number) => {
    setIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const toggle = useCallback((productId: number) => {
    setIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const has = useCallback(
    (productId: number) => ids.includes(productId),
    [ids]
  );

  return { ids, add, remove, toggle, has };
}