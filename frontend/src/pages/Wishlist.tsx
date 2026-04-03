import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useWishlist } from '../hooks/useWishlist';
import { products } from '../api/client';
import { normalizeProduct } from '../utils/productUtils';
import { mockHotDeals, mockNewArrivals } from '../data/mockData';
import type { Product } from '../types';
import '../styles/pages/Wishlist.css';

function findMockProduct(id: number): Product | null {
  const all = [...mockHotDeals, ...mockNewArrivals];
  return all.find((p) => p.id === id) ?? null;
}

export default function Wishlist() {
  const { ids, remove } = useWishlist();
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (ids.length === 0) {
      setProductList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const results: Product[] = [];
    for (const id of ids) {
      try {
        const res = await products.get(id);
        results.push(normalizeProduct(res.data as Parameters<typeof normalizeProduct>[0]));
      } catch {
        const mock = findMockProduct(id);
        if (mock) results.push(mock);
      }
    }
    setProductList(results);
    setLoading(false);
  }, [ids.join(',')]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <section className="pageSection wishlist-page">
      <div className="sectionContainer">
        <h1 className="wishlistTitle">Sản phẩm yêu thích</h1>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : productList.length === 0 ? (
          <div className="wishlistEmpty">
              <div className="wishlistEmptyIcon">🛒</div>
              <p>Danh sách trống.</p>
              <Link to="/products" className="wishlistEmptyBtn">Khám phá sản phẩm</Link>
          </div> 
        ) : (
          <div className="wishlistGrid">
            {productList.map((product) => (
              <div key={product.id} className="wishlistCardWrap">
                <button
                  type="button"
                  className="wishlistRemove"
                  onClick={() => remove(product.id)}
                  aria-label="Xóa khỏi yêu thích"
                >
                  ✕
                </button>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
