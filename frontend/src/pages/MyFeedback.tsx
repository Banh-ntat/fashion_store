import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviews as reviewsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { PurchasableProduct } from '../types';
import '../styles/pages/MyFeedback.css';

const FEEDBACK_TYPES = [
  { value: 'quality', label: 'Chất lượng sản phẩm' },
  { value: 'price', label: 'Giá cả' },
  { value: 'shipping', label: 'Vấn đề giao hàng' },
  { value: 'size', label: 'Kích thước/Size' },
  { value: 'service', label: 'Chăm sóc khách hàng' },
  { value: 'other', label: 'Khác' },
];

interface MyReview {
  id: number;
  product: number;
  product_name: string;
  rating: number;
  feedback_type: string;
  content: string;
  created_at: string;
}

export default function MyFeedback() {
  const { user } = useAuth();
  const [purchasableProducts, setPurchasableProducts] = useState<PurchasableProduct[]>([]);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PurchasableProduct | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, feedback_type: 'quality', content: '' });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      console.log('Loading feedback data...');
      const token = localStorage.getItem('access_token');
      console.log('Token exists:', !!token);

      const [purchRes, reviewsRes] = await Promise.all([
        reviewsApi.getPurchasable(),
        reviewsApi.getMyReviews(),
      ]);
      console.log('Purchasable response:', purchRes);
      console.log('My reviews response:', reviewsRes);
      setPurchasableProducts(purchRes?.data ?? []);
      setMyReviews(reviewsRes?.data ?? []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (product: PurchasableProduct) => {
    setSelectedProduct(product);
    setReviewForm({ rating: 5, feedback_type: 'quality', content: '' });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await reviewsApi.create({
        product: selectedProduct.variant_id,
        rating: reviewForm.rating,
        feedback_type: reviewForm.feedback_type,
        content: reviewForm.content,
      });
      alert('Cảm ơn bạn đã feedback!');
      setShowReviewModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Không thể gửi feedback.';
      alert(msg);
    }
  };

  if (!user) {
    return (
      <div className="my-feedback-page">
        <div className="empty-state">
          <h2>Vui lòng đăng nhập để xem đánh giá của bạn</h2>
          <Link to="/login" className="btn-primary">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="order-history-page"><div className="loading">Đang tải...</div></div>;
  }

  return (
    <div className="order-history-page">
      <h1>📝 Đánh giá sản phẩm đã mua</h1>
      <p className="page-desc">Đánh giá các sản phẩm bạn đã nhận được để giúp chúng tôi cải thiện dịch vụ.</p>

      {/* Sản phẩm có thể đánh giá */}
      {purchasableProducts.length > 0 && (
        <section className="orders-section">
          <h2>🎁 Sản phẩm có thể đánh giá ({purchasableProducts.length})</h2>
          <p className="section-hint">Các sản phẩm bạn đã mua và nhận hàng thành công (trong vòng 14 ngày)</p>
          <div className="orders-list">
            {purchasableProducts.map((item) => (
              <div key={`${item.order_id}-${item.variant_id}`} className="order-card purchasable">
                <div className="order-header">
                  <span className="order-id">Đơn hàng #{item.order_id}</span>
                  <span className="order-date">
                    {new Date(item.purchased_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="order-items">
                  <div className="order-item">
                    <div className="item-info">
                      <h4>{item.product_name}</h4>
                      <p className="item-variant">
                        Màu: {item.variant_info.color.name} | Size: {item.variant_info.size.name}
                      </p>
                      <p className="item-price">{parseFloat(item.price).toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div className="item-actions">
                      <span className="days-remaining">
                        Còn {item.days_remaining} ngày để đánh giá
                      </span>
                      <button
                        className="btn-review"
                        onClick={() => handleOpenReview(item)}
                      >
                        ⭐ Viết đánh giá
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {purchasableProducts.length === 0 && (
        <div className="empty-state">
          <p>Không có sản phẩm nào có thể đánh giá.</p>
          <Link to="/products" className="btn-secondary">Tiếp tục mua sắm</Link>
        </div>
      )}

      {/* Đánh giá đã gửi */}
      {myReviews.length > 0 && (
        <section className="orders-section">
          <h2>📋 Đánh giá của bạn ({myReviews.length})</h2>
          <div className="orders-list">
            {myReviews.map((review) => (
              <div key={review.id} className="order-card review-done">
                <div className="order-header">
                  <h4>{review.product_name}</h4>
                  <span className="review-date">
                    {new Date(review.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="review-content">
                  <div className="review-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={s <= review.rating ? 'filled' : ''}>★</span>
                    ))}
                  </div>
                  <span className="feedback-type-badge">
                    {FEEDBACK_TYPES.find(t => t.value === review.feedback_type)?.label}
                  </span>
                </div>
                {review.content && <p className="review-text">{review.content}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Viết đánh giá</h3>
            <div className="modal-product-info">
              <strong>{selectedProduct.product_name}</strong>
              <p>Màu: {selectedProduct.variant_info.color.name} | Size: {selectedProduct.variant_info.size.name}</p>
            </div>
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
