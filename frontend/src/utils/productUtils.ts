import type { Product, ApiProduct } from '../types';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop';

/**
 * Chuyển sản phẩm từ API (có thể thiếu image, old_price, stock) sang Product dùng cho UI.
 * Tái sử dụng cho mọi nơi gọi API products.
 */
export function normalizeProduct(api: ApiProduct): Product {
  const priceStr =
    typeof api.price === 'number' ? String(api.price) : (api.price ?? '0');
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? '',
    price: priceStr,
    old_price: api.old_price ?? null,
    stock: api.stock ?? 0,
    image: api.image ?? PLACEHOLDER_IMAGE,
    category: api.category,
    promotion: api.promotion,
    variants: api.variants ?? [],
  };
}

export function normalizeProducts(apiList: ApiProduct[]): Product[] {
  return apiList.map(normalizeProduct);
}
