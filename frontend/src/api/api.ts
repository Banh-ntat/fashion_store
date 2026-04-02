import type { ApiProduct, Category } from '../types';

const BASE = 'http://localhost:8000/api/products';

const getList = async <T>(url: string): Promise<T[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lỗi ${res.status}`);
  const data = await res.json();
  // tự động xử lý cả 2 dạng: [] hoặc { results: [] }
  return Array.isArray(data) ? data : data.results ?? [];
};

export const fetchCategories = () =>
  getList<Category>(`${BASE}/categories/`).then(data => data.slice(0, 4));

export const fetchHotDeals = () =>
  getList<ApiProduct>(`${BASE}/?has_promotion=true`).then(data => data.slice(0, 4));

export const fetchNewArrivals = () =>
  getList<ApiProduct>(`${BASE}/?ordering=-id`).then(data => data.slice(0, 4));