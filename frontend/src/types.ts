export interface Category {
  id: number;
  name: string;
  description: string;
  image: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  old_price: string | null;
  stock: number;
  image: string;
  category: { id: number; name: string };
  promotion: { id: number; name: string; discount_percent: number } | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  color: { id: number; name: string; code: string };
  size: { id: number; name: string };
  stock: number;
}

/** Dữ liệu từ API có thể thiếu image/old_price/stock */
export interface ApiProduct {
  id: number;
  name: string;
  description: string;
  price: string | number;
  category: { id: number; name: string };
  promotion: { id: number; name: string; discount_percent: number } | null;
  image?: string;
  old_price?: string | null;
  stock?: number;
  variants?: ProductVariant[];
}

export interface Profile {
  id: number;
  user: number;
  phone: string;
  address: string;
  role: string;
  avatar?: string | null;
}

export interface OrderItem {
  id: number;
  product: ApiProduct;
  variant_info?: { color: { id: number; name: string; code: string }; size: { id: number; name: string } } | null;
  quantity: number;
  price: string;
}

export interface Order {
  id: number;
  user: number;
  total_price: string;
  status: string;
  created_at: string;
  items: OrderItem[];
}
