import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import CategoryCard from "../components/CategoryCard";
import { useState, useEffect, useCallback } from "react";
import { fetchCategories, fetchHotDeals, fetchNewArrivals } from "../api/api";
import type { Category } from "../types";
import type { Product } from "../types";
import { discountCodes } from "../api/client";
import "../styles/pages/Home.css";

interface DiscountCode {
  id: number;
  name: string;
  code: string;
  discount_percent: number;
  min_order_value: string;
  end_date: string;
  effective_is_active: boolean;
}

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const normalize = (
  p: import("../types").ApiProduct,
): import("../types").Product => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: String(p.price),
  old_price: p.old_price ?? null,
  stock: p.stock ?? 0,
  image: p.image ?? "https://placehold.co/400x400?text=No+Image",
  category: p.category,
  promotion: p.promotion,
  variants: p.variants,
});

export default function Home() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchHotDeals(),
      fetchNewArrivals(),
      discountCodes.listActive(),
    ])
      .then(([cats, deals, arrivals, codesRes]) => {
        setCategories(cats);
        setHotDeals(deals.map(normalize));
        setNewArrivals(arrivals.map(normalize));
        const data = codesRes.data;
        setCodes(Array.isArray(data) ? data : (data.results ?? []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleClaimCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }, []);

  const handleShopWithCode = useCallback(
    (code: string) => {
      sessionStorage.setItem("pending_discount_code", code);
      navigate("/products");
    },
    [navigate],
  );

  if (loading)
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>Đang tải...</div>
    );

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
                Thời Trang
                <br />
                <em>Vượt Thời Gian</em>
              </h1>
              <p className="heroSubtitle">
                Khám phá bộ sưu tập được tuyển chọn kỹ lưỡng — kết hợp hoàn hảo
                giữa phong cách hiện đại và vẻ đẹp tinh tế.
              </p>
              <div className="heroActions">
                <Link to="/products" className="heroPrimaryBtn">
                  Mua Sắm Ngay <ArrowRight size={13} />
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
                src="https://bizweb.dktcdn.net/100/369/010/articles/000003.jpg?v=1618475656540"
                alt="New Fashion Collection"
                className="heroImgMain"
              />
              <div className="heroImgBadge">
                <div className="heroBadgeIcon">✦</div>
                <div>
                  <span className="heroBadgeTitle">Bộ sưu tập mới</span>
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
              <p className="sectionSubtitle">
                Tìm chính xác những gì bạn đang tìm kiếm
              </p>
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
      {codes.length > 0 && (
        <div className="sectionContainer" style={{ padding: "0 48px 80px" }}>
          <div className="promoBanner">
            {/* Nội dung bên trái */}
            <div className="promoContent">
              <span className="promoTag">Ưu Đãi Có Hạn</span>
              <h2 className="promoTitle">
                Mã Giảm Giá
                <br />
                Dành Cho Bạn
              </h2>
              <p className="promoSubtitle">
                Sao chép mã và dán vào ô mã giảm giá khi thanh toán
              </p>

              {/* Danh sách các mã — mỗi mã một hàng */}
              <div className="promoList">
                {codes.map((c) => (
                  <div key={c.id} className="promoItem">
                    <div className="promoInfo">
                      <span className="promoName">{c.name}</span>
                      <div className="promoCodeRow">
                        <strong className="promoCodeValue">{c.code}</strong>
                        <span className="promoDiscount">
                          -{c.discount_percent}%
                        </span>
                      </div>
                      {Number(c.min_order_value) > 0 && (
                        <span className="promoMinOrder">
                          Đơn từ{" "}
                          {Number(c.min_order_value).toLocaleString("vi-VN")}₫
                        </span>
                      )}
                    </div>
                    <div className="promoActions">
                      <button
                        type="button"
                        className={`promoBtn promoBtnCopy ${copiedCode === c.code ? "copied" : ""}`}
                        onClick={() => handleClaimCode(c.code)}
                      >
                        {copiedCode === c.code ? "Đã sao chép" : "Sao chép"}
                      </button>
                      <button
                        type="button"
                        className="promoBtn promoBtnShop"
                        onClick={() => handleShopWithCode(c.code)}
                      >
                        Mua ngay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=700&h=600&fit=crop&crop=center"
              alt="Sale"
              className="promoImage"
            />
          </div>
        </div>
      )}

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
              <ProductCard key={product.id} product={product} />
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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}