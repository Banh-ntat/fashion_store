import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products, cart, promotions, reviews as reviewsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import '../styles/components/ProductDetail.css';
import type { ProductVariant, Review } from '../types';

/** Ảnh placeholder khi API không trả về image */
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x500?text=San+pham';

const FEEDBACK_TYPES = [
  { value: 'quality', label: 'Chất lượng sản phẩm' },
  { value: 'price', label: 'Giá cả' },
  { value: 'shipping', label: 'Vấn đề giao hàng' },
  { value: 'size', label: 'Kích thước/Size' },
  { value: 'service', label: 'Chăm sóc khách hàng' },
  { value: 'other', label: 'Khác' },
];

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  old_price?: string | null;
  stock?: number;
  image?: string;
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
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, feedback_type: 'quality', content: '' });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const productId = Number(id);
      if (Number.isNaN(productId)) {
        setProduct(null);
        setLoading(false);
        return;
      }
      try {
        const productRes = await products.get(productId);
        const data = productRes?.data ?? null;
        setProduct(data as Product | null);
        if (!data) {
          setRelatedProducts([]);
          setActivePromotions([]);
          setLoading(false);
          return;
        }
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
        setRelatedProducts([]);
        setActivePromotions([]);
        setReviewsList([]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!product) {
      setSelectedColor('');
      setSelectedSize('');
      return;
    }
    const colorNames = product.variants
      ? [...new Set(product.variants.map((v) => v.color.name))]
      : [];
    const sizeNames = product.variants
      ? [...new Set(product.variants.map((v) => v.size.name))]
      : [];
    setSelectedColor((prev) => (colorNames.includes(prev) ? prev : colorNames[0] || ''));
    setSelectedSize((prev) => (sizeNames.includes(prev) ? prev : sizeNames[0] || ''));
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      alert('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
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
        ...(selectedVariant
          ? { product_variant_id: selectedVariant.id }
          : { product_id: product.id }),
      });
      alert('Đã thêm vào giỏ hàng!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        alert('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      } else {
        alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
      }
    }
  };

  const calculateDiscountedPrice = (price: string, discountPercent: number) => {
    const priceNum = parseFloat(price);
    return (priceNum - (priceNum * discountPercent) / 100).toFixed(2);
  };

  const handleOpenReview = async (variantId: number) => {
    if (!user) {
      alert('Vui lòng đăng nhập để đánh giá sản phẩm');
      return;
    }
    try {
      const res = await reviewsApi.getPurchasable();
      const purchasable = (res?.data ?? []) as { variant_id: number }[];
      const canReview = purchasable.some(p => p.variant_id === variantId);
      if (canReview) {
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
    if (!selectedVariant) {
      alert('Vui lòng chọn size và màu sắc trước khi đánh giá.');
      return;
    }

    try {
      await reviewsApi.create({
        product: selectedVariant.id,
        rating: reviewForm.rating,
        feedback_type: reviewForm.feedback_type,
        content: reviewForm.content,
      });
      alert('Cảm ơn bạn đã đánh giá!');
      setShowReviewModal(false);
      // Reload reviews
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

  const sizes = product.variants
    ? [...new Set(product.variants.map((v) => v.size.name))]
    : ['M'];
  const colors = product.variants
    ? [...new Set(product.variants.map((v) => v.color.name))]
    : [];
  const productImage = product.image || PLACEHOLDER_IMAGE;
  const selectedVariant = product.variants?.find(
    (v) => v.size.name === selectedSize && v.color.name === selectedColor
  );
  const variantStock = selectedVariant?.stock ?? product.stock ?? 0;

  return (
    <div className="product-detail">
      {/* Active Promotions Banner */}
      {activePromotions.length > 0 && (
        <div className="promotions-banner">
          <h3>Khuyến mãi đang diễn ra</h3>
          <div className="promotions-list">
            {activePromotions.map((promo) => (
              <span key={promo.id} className="promo-tag">
                {promo.name}: {promo.discount_percent}% OFF
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="product-main">
        {/* Image Section */}
        <div className="product-image-section">
          <div className="product-image-main">
            <img src={productImage} alt={product.name} />
            {product.promotion && (
              <span className="discount-badge">
                -{product.promotion.discount_percent}%
              </span>
            )}
            <button
              type="button"
              className={`image-wishlist-btn ${product ? isInWishlist(product.id) ? 'active' : '' : ''}`}
              title={product && isInWishlist(product.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              aria-label={product && isInWishlist(product.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              onClick={() => product && toggleWishlist(product.id)}
            >
              {product && isInWishlist(product.id) ? '♥' : '♡'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="product-info-section">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <Link to="/products">{product.category.name}</Link>
            <span>{product.name}</span>
          </nav>

          <h1>{product.name}</h1>

          {/* Rating */}
          <div className="product-rating">
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= Number(averageRating) ? 'filled' : ''}>★</span>
              ))}
            </div>
            <span className="rating-count">({reviewsList.length} đánh giá)</span>
          </div>

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

          <div className="product-description">
            <p>{product.description}</p>
          </div>

          <div className="product-options">
            {colors.length > 0 && (
              <div className="color-selection">
                <label>Màu sắc:</label>
                <div className="color-buttons">
                  {colors.map((color) => {
                    const variant = product.variants?.find((v) => v.color.name === color);
                    return (
                      <button
                        key={color}
                        className={`color-btn ${selectedColor === color ? 'selected' : ''} ${variant?.color.code?.toLowerCase() === '#ffffff' || variant?.color.code?.toLowerCase() === '#fff' || variant?.color.code?.toLowerCase() === 'white' ? 'white' : ''}`}
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: variant?.color.code || '#000' }}
                        title={color}
                      >
                        {selectedColor === color && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="size-selection">
              <label>Size:</label>
              <div className="size-buttons">
                {sizes.map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="quantity-selection">
              <label>Số lượng:</label>
              <div className="quantity-controls">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(variantStock, quantity + 1))}>+</button>
              </div>
              <span className="stock-info">{variantStock} có sẵn</span>
            </div>
          </div>

          <div className="product-actions">
            <button 
              className="add-to-cart-btn" 
              onClick={handleAddToCart}
              disabled={variantStock === 0}
            >
              {variantStock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              type="button"
              className={`wishlist-btn ${product && isInWishlist(product.id) ? 'active' : ''}`}
              onClick={() => product && toggleWishlist(product.id)}
              aria-label={product && isInWishlist(product.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
            >
              {product && isInWishlist(product.id) ? '♥' : '♡'} Yêu thích
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

          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <Link to={`/?category=${product.category.id}`}>{product.category.name}</Link>
            </div>
            {product.promotion && (
              <div className="meta-item">
                <span className="meta-label">Promotion:</span>
                <span>{product.promotion.name}</span>
              </div>
            )}
          </div>

          {/* Review Button */}
          {user && selectedVariant && (
            <div className="review-cta">
              <button
                className="btn-review-product"
                onClick={() => handleOpenReview(selectedVariant.id)}
              >
                Viết đánh giá sản phẩm này
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <section className="product-reviews">
        <h2>Đánh giá sản phẩm ({reviewsList.length})</h2>
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
                      {FEEDBACK_TYPES.find(t => t.value === review.feedback_type)?.label}
                    </span>
                  </div>
                </div>
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= review.rating ? 'filled' : ''}>★</span>
                  ))}
                </div>
                {review.content && <p className="review-text">{review.content}</p>}
                {review.variant_info && (
                  <p className="review-variant">
                    Phân loại: {review.variant_info.color.name} | {review.variant_info.size.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-reviews">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>
        )}
      </section>

      {/* Related Products */}
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
                      ? calculateDiscountedPrice(related.price, related.promotion.discount_percent)
                      : related.price}đ
                    {related.old_price && <span className="old-price">{related.old_price}đ</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Viết đánh giá sản phẩm</h3>
            {selectedVariant && (
              <div className="modal-product-info">
                <strong>{product?.name}</strong>
                <p>Màu: {selectedVariant.color.name} | Size: {selectedVariant.size.name}</p>
              </div>
            )}
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Đánh giá của bạn:</label>
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={s <= reviewForm.rating ? 'selected' : ''}
                      onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Loại feedback:</label>
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
                <label>Nội dung (tùy chọn):</label>
                <textarea
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  rows={4}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>
                  Hủy
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
