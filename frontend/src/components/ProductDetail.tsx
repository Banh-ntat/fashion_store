import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products, cart, promotions, reviews as reviewsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import '../styles/components/ProductDetail.css';
import type { ProductVariant, Review } from '../types';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x500?text=San+pham';

const FEEDBACK_TYPES = [
  { value: 'quality', label: 'Chất lượng sản phẩm' },
  { value: 'price',   label: 'Giá cả' },
  { value: 'shipping',label: 'Vấn đề giao hàng' },
  { value: 'size',    label: 'Kích thước/Size' },
  { value: 'service', label: 'Chăm sóc khách hàng' },
  { value: 'other',   label: 'Khác' },
];

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  old_price?: string | null;
  stock?: number;
  image?: string;
  images?: string[];
  category: { id: number; name: string };
  promotion: { id: number; name: string; discount_percent: number } | null;
  variants?: ProductVariant[];
}

interface Promotion {
  id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toggle: toggleWishlist, has: isInWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, feedback_type: 'quality', content: '' });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      const productId = Number(id);
      if (Number.isNaN(productId)) { setProduct(null); setLoading(false); return; }
      try {
        const productRes = await products.get(productId);
        const data = productRes?.data ?? null;
        setProduct(data as Product | null);
        if (!data) { setLoading(false); return; }
        const [relatedRes, promotionsRes, reviewsRes] = await Promise.all([
          products.related(productId),
          promotions.active(),
          reviewsApi.getByProduct(productId),
        ]);
        setRelatedProducts((relatedRes?.data ?? []) as Product[]);
        setActivePromotions((promotionsRes?.data ?? []) as Promotion[]);
        setReviewsList((reviewsRes?.data ?? []) as Review[]);
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!product) { setSelectedColor(''); setSelectedSize(''); return; }
    const colorNames = product.variants ? [...new Set(product.variants.map((v) => v.color.name))] : [];
    const sizeNames  = product.variants ? [...new Set(product.variants.map((v) => v.size.name))]  : [];
    setSelectedColor((prev) => (colorNames.includes(prev) ? prev : colorNames[0] || ''));
    setSelectedSize ((prev) => (sizeNames.includes(prev)  ? prev : sizeNames[0]  || ''));
    setActiveImageIndex(0);
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) { alert('Vui lòng đăng nhập để thêm vào giỏ hàng'); return; }
    const selectedVariant = product.variants?.find(
      (v) => v.size.name === selectedSize && v.color.name === selectedColor
    );
    if (product.variants?.length && !selectedVariant) {
      alert('Vui lòng chọn size và màu sắc.');
      return;
    }
    try {
      await cart.addItem({
        quantity,
        ...(selectedVariant ? { product_variant_id: selectedVariant.id } : { product_id: product.id }),
      });
      alert('Đã thêm vào giỏ hàng!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) alert('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      else alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
    }
  };

  const calculateDiscountedPrice = (price: string, discountPercent: number) => {
    const priceNum = parseFloat(price);
    return (priceNum - (priceNum * discountPercent) / 100).toFixed(2);
  };

  const handleOpenReview = async (variantId: number) => {
    if (!user) { alert('Vui lòng đăng nhập để đánh giá sản phẩm'); return; }
    try {
      const res = await reviewsApi.getPurchasable();
      const purchasable = (res?.data ?? []) as { variant_id: number }[];
      if (purchasable.some((p) => p.variant_id === variantId)) {
        setShowReviewModal(true);
        setReviewForm({ rating: 5, feedback_type: 'quality', content: '' });
      } else {
        alert('Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng thành công.');
      }
    } catch {
      alert('Không thể tải thông tin. Vui lòng thử lại.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVariant = product?.variants?.find(
      (v) => v.size.name === selectedSize && v.color.name === selectedColor
    );
    if (!selectedVariant) { alert('Vui lòng chọn size và màu sắc trước khi đánh giá.'); return; }
    try {
      await reviewsApi.create({
        product: selectedVariant.id,
        rating: reviewForm.rating,
        feedback_type: reviewForm.feedback_type,
        content: reviewForm.content,
      });
      alert('Cảm ơn bạn đã đánh giá!');
      setShowReviewModal(false);
      const reviewsRes = await reviewsApi.getByProduct(Number(id));
      setReviewsList((reviewsRes?.data ?? []) as Review[]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Không thể gửi đánh giá.';
      alert(msg);
    }
  };

  const averageRating = reviewsList.length > 0
    ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length).toFixed(1)
    : 0;

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!product) {
    return (
      <div className="product-detail product-detail--not-found">
        <p className="error">Không tìm thấy sản phẩm.</p>
        <Link to="/products" className="back-link">← Quay lại danh sách sản phẩm</Link>
      </div>
    );
  }

  const sizes  = product.variants ? [...new Set(product.variants.map((v) => v.size.name))]  : ['M'];
  const colors = product.variants ? [...new Set(product.variants.map((v) => v.color.name))] : [];

  // Build image list: variants may each have an image, fallback to product.image
  const allImages: string[] = (() => {
    const imgs: string[] = [];
    if (product.images && product.images.length) {
      imgs.push(...product.images);
    } else if (product.image) {
      imgs.push(product.image);
    } else {
      imgs.push(PLACEHOLDER_IMAGE);
    }
    return imgs;
  })();

  const mainImageSrc = allImages[activeImageIndex] || PLACEHOLDER_IMAGE;
  const hasThumbnails = allImages.length > 1;

  const selectedVariant = product.variants?.find(
    (v) => v.size.name === selectedSize && v.color.name === selectedColor
  );
  const variantStock = selectedVariant?.stock ?? product.stock ?? 0;

  return (
    <div className="product-detail">

      {/* Active Promotions Banner */}
      {activePromotions.length > 0 && (
        <div className="promotions-banner">
          <h3>🏷 Khuyến mãi đang diễn ra</h3>
          <div className="promotions-list">
            {activePromotions.map((promo) => (
              <span key={promo.id} className="promo-tag">
                {promo.name}: -{promo.discount_percent}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="product-main">

        {/* ── Image Section ── */}
        <div className={`product-image-section${hasThumbnails ? '' : ' no-thumbs'}`}>

          {/* Thumbnail strip */}
          {hasThumbnails && (
            <div className="product-thumbnails">
              {allImages.map((src, idx) => (
                <div
                  key={idx}
                  className={`thumbnail-item${activeImageIndex === idx ? ' active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={src} alt={`${product.name} ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}

          {/* Main image */}
          <div className="product-image-main">
            <img src={mainImageSrc} alt={product.name} />
            {product.promotion && (
              <span className="discount-badge">-{product.promotion.discount_percent}%</span>
            )}
            <button
              type="button"
              className={`image-wishlist-btn${isInWishlist(product.id) ? ' active' : ''}`}
              title={isInWishlist(product.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              aria-label={isInWishlist(product.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              onClick={() => toggleWishlist(product.id)}
            >
              {isInWishlist(product.id) ? '♥' : '♡'}
            </button>
          </div>
        </div>

        {/* ── Info Section ── */}
        <div className="product-info-section">

          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/products">{product.category.name}</Link>
            <span className="sep">/</span>
            <span>{product.name}</span>
          </nav>

          <h1>{product.name}</h1>

          {/* Rating */}
          <div className="product-rating">
            <div className="rating-stars">
              {[1,2,3,4,5].map((star) => (
                <span key={star}>{star <= Number(averageRating) ? '★' : '☆'}</span>
              ))}
            </div>
            <span className="rating-count">
              {reviewsList.length > 0
                ? `${averageRating} (${reviewsList.length} đánh giá)`
                : 'Chưa có đánh giá'}
            </span>
          </div>

          {/* Price */}
          <div className="product-price">
            {product.promotion ? (
              <>
                <span className="current-price">
                  {calculateDiscountedPrice(product.price, product.promotion.discount_percent)}đ
                </span>
                <span className="original-price">{product.price}đ</span>
                <span className="discount-tag">-{product.promotion.discount_percent}%</span>
              </>
            ) : (
              <span className="current-price">{product.price}đ</span>
            )}
          </div>

          {/* Description */}
          <div className="product-description">
            <p>{product.description}</p>
          </div>

          {/* Options */}
          <div className="product-options">

            {/* Colors */}
            {colors.length > 0 && (
              <div className="color-selection">
                <label>
                  Màu sắc:{' '}
                  <span className="color-name-label" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
                    {selectedColor}
                  </span>
                </label>
                <div className="color-buttons">
                  {colors.map((color) => {
                    const variant = product.variants?.find((v) => v.color.name === color);
                    const code = variant?.color.code || '#888';
                    const isWhite = ['#ffffff','#fff','white'].includes(code.toLowerCase());
                    return (
                      <button
                        key={color}
                        className={`color-btn${selectedColor === color ? ' selected' : ''}${isWhite ? ' white' : ''}`}
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: code }}
                        title={color}
                        aria-label={color}
                        type="button"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div className="size-selection">
              <label>Kích thước:</label>
              <div className="size-buttons">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`size-btn${selectedSize === size ? ' selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="quantity-selection">
              <label>Số lượng:</label>
              <div className="quantity-controls">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(Math.min(variantStock, quantity + 1))}>+</button>
              </div>
              <span className="stock-info">{variantStock} sản phẩm có sẵn</span>
            </div>
          </div>

          {/* Actions */}
          <div className="product-actions">
            <button
              className="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={variantStock === 0}
              type="button"
            >
              {variantStock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              type="button"
              className={`wishlist-btn${isInWishlist(product.id) ? ' active' : ''}`}
              onClick={() => toggleWishlist(product.id)}
              aria-label={isInWishlist(product.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
            >
              {isInWishlist(product.id) ? '♥' : '♡'} Yêu thích
            </button>
          </div>

          {/* Trust Badges */}
          <div className="product-trust-badges">
            <div className="trust-badge">
              <div className="trust-badge-text">
                <strong>Miễn phí vận chuyển</strong>
                <span>Đơn hàng từ 500K</span>
              </div>
            </div>
            <div className="trust-badge">
              <div className="trust-badge-text">
                <strong>Chính hãng 100%</strong>
                <span>Cam kết authentic</span>
              </div>
            </div>
            <div className="trust-badge">
              <div className="trust-badge-text">
                <strong>Đổi trả dễ dàng</strong>
                <span>Trong 30 ngày</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews Section ── */}
      <section className="product-reviews">
        <div className="reviews-header">
          <h2>Đánh giá sản phẩm ({reviewsList.length})</h2>
          {user && selectedVariant && (
            <button
              className="btn-review-product"
              type="button"
              onClick={() => handleOpenReview(selectedVariant.id)}
            >
              Viết đánh giá
            </button>
          )}
        </div>

        {/* Summary bar */}
        {reviewsList.length > 0 && (
          <div className="reviews-summary">
            <span className="avg-score">{averageRating}</span>
            <div>
              <div className="avg-stars">
                {[1,2,3,4,5].map((s) => (
                  <span key={s}>{s <= Math.round(Number(averageRating)) ? '★' : '☆'}</span>
                ))}
              </div>
              <div className="avg-count">{reviewsList.length} đánh giá</div>
            </div>
          </div>
        )}

        {reviewsList.length > 0 ? (
          <div className="reviews-list">
            {reviewsList.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-user">
                    <span className="user-avatar">{review.user.username.charAt(0).toUpperCase()}</span>
                    <span className="user-name">{review.user.username}</span>
                  </div>
                  <div className="review-meta">
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="feedback-type-badge">
                      {FEEDBACK_TYPES.find((t) => t.value === review.feedback_type)?.label}
                    </span>
                  </div>
                </div>
                <div className="review-stars">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className={s <= review.rating ? 'filled' : ''}>★</span>
                  ))}
                </div>
                {review.content && <p className="review-text">{review.content}</p>}
                {review.variant_info && (
                  <p className="review-variant">
                    Phân loại: {review.variant_info.color.name} / {review.variant_info.size.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-reviews">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>
        )}
      </section>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <h2>Sản phẩm liên quan</h2>
          <div className="related-products-grid">
            {relatedProducts.map((related) => (
              <Link to={`/product/${related.id}`} key={related.id} className="related-product-card">
                <div className="related-product-image">
                  <img src={related.image || PLACEHOLDER_IMAGE} alt={related.name} />
                  {related.promotion && (
                    <span className="related-discount">-{related.promotion.discount_percent}%</span>
                  )}
                </div>
                <div className="related-product-info">
                  <h4>{related.name}</h4>
                  <p className="price">
                    {related.promotion
                      ? `${calculateDiscountedPrice(related.price, related.promotion.discount_percent)}đ`
                      : `${related.price}đ`}
                    {related.old_price && <span className="old-price">{related.old_price}đ</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Review Modal ── */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}>
          <div className="modal">
            <h3>Viết đánh giá sản phẩm</h3>
            {selectedVariant && (
              <div className="modal-product-info">
                <strong>{product?.name}</strong>
                <p>Màu: {selectedVariant.color.name} &nbsp;|&nbsp; Size: {selectedVariant.size.name}</p>
              </div>
            )}
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Đánh giá của bạn</label>
                <div className="star-picker">
                  {[1,2,3,4,5].map((s) => (
                    <span
                      key={s}
                      className={s <= reviewForm.rating ? 'selected' : ''}
                      onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      role="button"
                      aria-label={`${s} sao`}
                    >★</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Loại phản hồi</label>
                <select
                  value={reviewForm.feedback_type}
                  onChange={(e) => setReviewForm({ ...reviewForm, feedback_type: e.target.value })}
                >
                  {FEEDBACK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nội dung <span style={{ color: '#aaa', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                <textarea
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                  rows={4}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>
                  Huỷ
                </button>
                <button type="submit" className="btn-primary">
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;