import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import type { Product } from '../types';
import '../styles/pages/Products.css';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('category')
    ? Number(searchParams.get('category'))
    : undefined;

  const { items: products, loading, error } = useProducts({ categoryId });
  const { items: categories } = useCategories();

  const currentCategory = categories.find(c => c.id === categoryId);
  const title = currentCategory ? currentCategory.name : 'Tất cả sản phẩm';

  const handleAddToCart = (product: Product) => {
    console.log('Đã thêm vào giỏ:', product.name);
  };

  return (
    <section className="products-page">
      <div className="sectionContainer">
        <div className="sectionHeader">
          <div>
            <h1 className="sectionTitle">{title}</h1>
            <p className="sectionSubtitle">
              {loading
                ? 'Đang tải sản phẩm...'
                : `${products.length} sản phẩm có sẵn`}
            </p>
          </div>
        </div>

        <div className="productsLayout">
          <aside className="productsSidebar">
            <h3 className="sidebarTitle">Danh mục</h3>
            <nav className="categoryNav">
              <button
                type="button"
                className={`categoryNavItem ${!categoryId ? 'active' : ''}`}
                onClick={() => setSearchParams({})}
              >
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`categoryNavItem ${categoryId === cat.id ? 'active' : ''}`}
                  onClick={() => setSearchParams({ category: String(cat.id) })}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          </aside>

          <div className="productsMain">
            {error && (
              <p className="productsFallbackNote">{error}</p>
            )}
            {loading ? (
              <div className="productsLoading">
                <div className="loading">Đang tải...</div>
              </div>
            ) : products.length === 0 ? (
              <p className="productsEmpty">
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📦</span>
                Chưa có sản phẩm nào trong danh mục này.
              </p>
            ) : (
              <>
                <div className="productsResults">
                  <span className="productsResultsCount">
                    Hiển thị <strong>{products.length}</strong> sản phẩm
                  </span>
                </div>
                <div className="productGrid">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
