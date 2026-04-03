import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import { useState, useEffect } from 'react';
import { fetchCategories, fetchHotDeals, fetchNewArrivals } from '../api/api';
import type { Category } from '../types';
import type { Product } from '../types';
import '../styles/pages/Home.css';

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const normalize = (p: import('../types').ApiProduct): import('../types').Product => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: String(p.price),
  old_price: p.old_price ?? null,
  stock: p.stock ?? 0,
  image: p.image ?? 'https://placehold.co/400x400?text=No+Image',
  category: p.category,
  promotion: p.promotion,
});

export default function Home() {
    // ── 1. STATE ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [hotDeals, setHotDeals]     = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // ── 2. FETCH ──
  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchHotDeals(),
      fetchNewArrivals(),
    ])
      .then(([cats, deals, arrivals]) => {
        setCategories(cats);
        setHotDeals(deals.map(normalize));
        setNewArrivals(arrivals.map(normalize));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── 3. LOADING ──
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Đang tải...</div>;

  const handleAddToCart = (product: Product) => {
    console.log('Added to cart:', product.name);
  };

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="sectionContainer">
          <div className="heroContent">

            <div className="heroText">
              <div className="heroTag">
                <span className="heroTagDot" />
                Bộ Sưu Tập Mới 2025
              </div>

              <h1 className="heroTitle">
                Thời Trang<br />
                <em>Vượt Thời Gian</em>
              </h1>

              <p className="heroSubtitle">
                Khám phá bộ sưu tập được tuyển chọn kỹ lưỡng —
                kết hợp hoàn hảo giữa phong cách hiện đại và vẻ đẹp tinh tế.
              </p>

              <div className="heroActions">
                <Link to="/products" className="heroPrimaryBtn">
                  Mua Sắm Ngay <ArrowRight size={13} />
                </Link>
                <Link to="/about" className="heroSecondaryBtn">
                  Câu Chuyện Của Chúng Tôi <ArrowRight size={13} />
                </Link>
              </div>

              <div className="heroStats">
                <div className="heroStat">
                  <span className="heroStatNum">500+</span>
                  <span className="heroStatLabel">Sản Phẩm</span>
                </div>
                <div className="heroStat">
                  <span className="heroStatNum">50k+</span>
                  <span className="heroStatLabel">Khách Hàng</span>
                </div>
                <div className="heroStat">
                  <span className="heroStatNum">4.9★</span>
                  <span className="heroStatLabel">Đánh Giá</span>
                </div>
              </div>
            </div>

            <div className="heroImageWrapper">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=700&fit=crop"
                alt="New Fashion Collection"
                className="heroImgMain"
              />
              <div className="heroImgBadge">
                <div className="heroBadgeIcon">✦</div>
                <div>
                  <span className="heroBadgeTitle">New Arrivals</span>
                  <span className="heroBadgeSub">Just dropped this week</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="pageSection">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <div>
              <div className="sectionDivider" />
              <h2 className="sectionTitle">Danh Mục Sản Phẩm</h2>
              <p className="sectionSubtitle">Tìm chính xác những gì bạn đang tìm kiếm</p>
            </div>
            <Link to="/products" className="viewAll">
              Xem Tất Cả <ArrowRight size={11} />
            </Link>
          </div>

          <div className="categoriesGrid">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PROMO ── */}
      <div className="sectionContainer">
        <div className="promoBanner">
          <div className="promoContent">
            <span className="promoTag">Ưu Đãi Có Hạn</span>
            <h2 className="promoTitle">
              Sale Hè<br />Giảm 50%
            </h2>
            <p className="promoSubtitle">Mua sắm ngay trước khi hết hàng</p>
            <div className="promoCode">
              <span className="promoCodeLabel">Mã:</span>
              <span className="promoCodeValue">SUMMER50</span>
            </div>
            <br />
            <Link to="/" className="promoBtn">
              Nhận Ưu Đãi <ArrowRight size={13} />
            </Link>
          </div>

          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=300&fit=crop"
            alt="Sale Hè"
            className="promoImage"
          />
        </div>
      </div>

      {/* ── HOT DEALS ── */}
      <section className="pageSection">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <div>
              <div className="sectionDivider" />
              <h2 className="sectionTitle">Ưu Đãi Hot</h2>
              <p className="sectionSubtitle">
                Đừng bỏ lỡ những ưu đãi có thời hạn cực kỳ hấp dẫn
              </p>
            </div>
            <Link to="/products?has_promotion=true" className="viewAll">
              Xem Tất Cả <ArrowRight size={11} />
            </Link>
          </div>

          <div className="productGrid">
            {hotDeals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      <section className="pageSectionWhite">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <div>
              <div className="sectionDivider" />
              <h2 className="sectionTitle">Hàng Mới Về</h2>
              <p className="sectionSubtitle">
                Những sản phẩm mới nhất vừa được thêm vào bộ sưu tập
              </p>
            </div>
            <Link to="/products?ordering=-id" className="viewAll">
              Xem Tất Cả <ArrowRight size={11} />
            </Link>
          </div>

          <div className="productGrid">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}