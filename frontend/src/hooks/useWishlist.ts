import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fashion_store_wishlist';

function getStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

function setStoredIds(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/** Hook quản lý wishlist (localStorage). Có thể thay bằng API sau. */
export function useWishlist() {
  const [ids, setIds] = useState<number[]>(() => getStoredIds());

  useEffect(() => {
    setStoredIds(ids);
  }, [ids]);

  const add = useCallback((productId: number) => {
    setIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  }, []);

  const remove = useCallback((productId: number) => {
    setIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const toggle = useCallback((productId: number) => {
    setIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const has = useCallback(
    (productId: number) => ids.includes(productId),
    [ids]
  );

  return { ids, add, remove, toggle, has };
}
