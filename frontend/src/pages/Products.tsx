import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useMemo, useState } from 'react';
import '../styles/pages/Products.css';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryId = searchParams.get('category')
    ? Number(searchParams.get('category'))
    : undefined;

  // Đọc từ khoá từ navbar search (URL param ?search=...)
  const query = searchParams.get('search') ?? '';

  const { items: products, loading, error } = useProducts({ categoryId });
  console.log(products);
  const { items: categories } = useCategories();

  const [sort, setSort] = useState('default');

  const currentCategory = categories.find(c => c.id === categoryId);

  const titleMain   = query ? 'Kết quả' : currentCategory ? 'Danh mục' : 'Tất cả';
  const titleItalic = query ? `"${query}"` : currentCategory ? currentCategory.name : 'Sản Phẩm';

  /* Filter + sort — client-side */
  const displayed = useMemo(() => {
    let list = [...products];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    }

    if (sort === 'price-asc')  list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name-asc')   list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'popular') list.sort((a, b) =>Number(b.sold_count ?? b.review_count ?? 0) -Number(a.sold_count ?? a.review_count ?? 0));
    if (sort === 'rating') list.sort((a, b) =>Number(b.rating ?? 0) - Number(a.rating ?? 0));

    return list;
  }, [products, query, sort]);

  // Khi chọn danh mục thì xoá search để tránh conflict
  const handleCategoryClick = (id?: number) => {
    setSearchParams(id ? { category: String(id) } : {});
    setSort('default');
  };

  return (
    <section className="products-page">
      <div className="sectionContainer">

        {/* ── Header ── */}
        <div className="sectionHeader">
          <div>
            <h1 className="sectionTitle">
              {titleMain} <em>{titleItalic}</em>
            </h1>
            <p className="sectionSubtitle">
              {loading ? 'Đang tải sản phẩm…' : `${displayed.length} sản phẩm có sẵn`}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="productsLayout">

          {/* ── Sidebar ── */}
          <aside className="productsSidebar">

            {/* Danh mục */}
            <h3 className="sidebarTitle">Danh mục</h3>
            <nav className="categoryNav">
              <button
                type="button"
                className={`categoryNavItem ${!categoryId && !query ? 'active' : ''}`}
                onClick={() => handleCategoryClick()}
              >
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`categoryNavItem ${categoryId === cat.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </nav>

            {/* Sắp xếp */}
            <h3 className="sidebarTitle" style={{ marginTop: '28px' }}>Sắp xếp</h3>
            <div className="sortNav">
              {([
                { value: 'default',    label: 'Mặc định' },
                { value: 'price-asc',  label: 'Giá tăng dần' },
                { value: 'price-desc', label: 'Giá giảm dần' },
                { value: 'name-asc',   label: 'Tên A → Z' },
                { value: 'popular',    label: 'Phổ biến nhất' },
                { value: 'rating',     label: 'Đánh giá cao nhất' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sortNavItem ${sort === opt.value ? 'active' : ''}`}
                  onClick={() => setSort(opt.value)}
                >
                  <span className="sortRadio" />
                  {opt.label}
                </button>
              ))}
            </div>

          </aside>

          {/* ── Main ── */}
          <div className="productsMain">

            {error && <p className="productsFallbackNote">{error}</p>}

            {loading ? (
              <div className="productsLoading">
                <div className="loading">Đang tải</div>
              </div>
            ) : displayed.length === 0 ? (
              <p className="productsEmpty">
                {query
                  ? `Không tìm thấy sản phẩm nào cho "${query}".`
                  : 'Chưa có sản phẩm nào trong danh mục này.'}
              </p>
            ) : (
              <>
                <div className="productsResults">
                  <span className="productsResultsCount">
                    Hiển thị <strong>{displayed.length}</strong> sản phẩm
                    {query && <> cho <strong>"{query}"</strong></>}
                  </span>
                </div>

                <div className="productGrid">
                  {displayed.map((product) => (
                    <ProductCard key={product.id} product={product} />
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