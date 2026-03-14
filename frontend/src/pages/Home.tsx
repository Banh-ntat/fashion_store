import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import { mockCategories, mockHotDeals, mockNewArrivals } from '../data/mockData';
import type { Product } from '../types';
import '../styles/pages/Home.css';

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default function Home() {
  const handleAddToCart = (product: Product) => {
    console.log('Added to cart:', product.name);
  };

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="sectionContainer">
          <div className="heroContent">

            <div className="heroText">

              <div className="heroTag">
                <span className="heroTagDot"></span>
                Bộ Sưu Tập Mới 2025
              </div>

              <h1 className="heroTitle">
                Bộ Sưu Tập<br />
                <em>Thời Trang Mới</em>
              </h1>

              <p className="heroSubtitle">
                Khám phá bộ sưu tập được tuyển chọn kỹ lưỡng,
                kết hợp hoàn hảo giữa phong cách hiện đại và vẻ đẹp vượt thời gian.
              </p>

              <div className="heroActions">
                <Link to="/" className="heroPrimaryBtn">
                  Mua Sắm Ngay <ArrowRight size={14} />
                </Link>

                <Link to="/about" className="heroSecondaryBtn">
                  Câu Chuyện Của Chúng Tôi <ArrowRight size={14} />
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
                <div className="heroBadgeText">
                  <span className="heroBadgeTitle">New Arrivals</span>
                  <span className="heroBadgeSub">Just dropped this week</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="pageSection">
        <div className="sectionContainer">

          <div className="sectionHeader">
            <div>
              <h2 className="sectionTitle">Danh Mục Sản Phẩm</h2>
              <p className="sectionSubtitle">Tìm chính xác những gì bạn đang tìm kiếm</p>
            </div>

            <Link to="/" className="viewAll">
              Xem Tất Cả <ArrowRight size={12} />
            </Link>
          </div>

          <div className="categoriesGrid">
            {mockCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>

        </div>
      </section>

      {/* PROMO */}
      <div className="sectionContainer">
        <div className="promoBanner">

          <div className="promoContent">

            <span className="promoTag">Ưu Đãi Có Hạn</span>

            <h2 className="promoTitle">
              Sale Hè<br />Giảm Đến 50%
            </h2>

            <p className="promoSubtitle">
              Mua sắm ngay trước khi hết hàng
            </p>

            <div className="promoCode">
              <span className="promoCodeLabel">Mã:</span>
              <span className="promoCodeValue">SUMMER50</span>
            </div>

            <br />

            <Link to="/" className="promoBtn">
              Nhận Ưu Đãi <ArrowRight size={14} />
            </Link>

          </div>

          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=300&fit=crop"
            alt="Sale Hè"
            className="promoImage"
          />

        </div>
      </div>

      {/* HOT DEALS */}
      <section className="pageSection">
        <div className="sectionContainer">

          <div className="sectionHeader">
            <div>
              <h2 className="sectionTitle">Ưu Đãi Hot 🔥</h2>
              <p className="sectionSubtitle">
                Đừng bỏ lỡ những ưu đãi có thời hạn cực kỳ hấp dẫn này
              </p>
            </div>

            <Link to="/" className="viewAll">
              Xem Tất Cả <ArrowRight size={12} />
            </Link>
          </div>

          <div className="productGrid">
            {mockHotDeals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="pageSectionWhite">
        <div className="sectionContainer">

          <div className="sectionHeader">
            <div>
              <h2 className="sectionTitle">Hàng Mới Về ✦</h2>
              <p className="sectionSubtitle">
                Những sản phẩm mới nhất vừa được thêm vào bộ sưu tập
              </p>
            </div>

            <Link to="/" className="viewAll">
              Xem Tất Cả <ArrowRight size={12} />
            </Link>
          </div>

          <div className="productGrid">
            {mockNewArrivals.map((product) => (
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