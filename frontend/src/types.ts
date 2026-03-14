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
