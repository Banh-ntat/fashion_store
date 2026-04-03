import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviews as reviewsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { PurchasableProduct } from '../types';
import '../styles/pages/MyFeedback.css';

const FEEDBACK_TYPES = [
  { value: 'quality', label: 'Chất lượng sản phẩm' },
  { value: 'price', label: 'Giá cả' },
  { value: 'shipping', label: 'Giao hàng' },
  { value: 'size', label: 'Size' },
  { value: 'service', label: 'Dịch vụ' },
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
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [purchRes, reviewsRes] = await Promise.all([
        reviewsApi.getPurchasable(),
        reviewsApi.getMyReviews(),
      ]);
      setPurchasableProducts(purchRes?.data ?? []);
      setMyReviews(reviewsRes?.data ?? []);
    } catch (err) {
      console.error(err);
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

    await reviewsApi.create({
      product: selectedProduct.variant_id,
      rating: reviewForm.rating,
      feedback_type: reviewForm.feedback_type,
      content: reviewForm.content,
    });

    setShowReviewModal(false);
    loadData();
  };

  if (!user) {
    return (
      <div className="my-feedback-page">
        <div className="empty-state">
          <h2>Vui lòng đăng nhập</h2>
          <Link to="/login" className="btn-primary">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="my-feedback-page">Đang tải...</div>;

  return (
    <div className="my-feedback-page">
      <div className="page-header">
        <h1>Đánh giá sản phẩm</h1>
      </div>

      {purchasableProducts.length > 0 && (
        <section className="feedback-section">
          <h2 className="section-title">Chờ đánh giá ({purchasableProducts.length})</h2>
          {purchasableProducts.map((item) => (
            <div key={item.variant_id} className="purchasable-card">
              <div>
                <strong>{item.product_name}</strong>
                <p>{item.variant_info.color.name} - {item.variant_info.size.name}</p>
              </div>
              <button onClick={() => handleOpenReview(item)} className="btn-review-now">
                Đánh giá
              </button>
            </div>
          ))}
        </section>
      )}

      {purchasableProducts.length === 0 && myReviews.length === 0 && (
        <div className="empty-state">
        <div className="empty-icon">🛒</div>
          <p>Bạn chưa có sản phẩm nào để đánh giá</p>
          <Link to="/products" className="btn-primary">Mua ngay</Link>
        </div>
      )}

      {myReviews.map((review) => (
        <div key={review.id} className="review-card-compact">
          <div className="review-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>

          <div className="review-main">
            <div className="review-top">
              <span className="username">{user.username}</span>
              <span className="date">
                {new Date(review.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="stars-row">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={s <= review.rating ? 'star filled' : 'star'}>★</span>
              ))}
            </div>

            {review.content && (
              <p className="review-text">{review.content}</p>
            )}

            <div className="product-attached">
              <div className="product-name-mini">🛍 {review.product_name}</div>
              <span className="feedback-badge">
                {FEEDBACK_TYPES.find(t => t.value === review.feedback_type)?.label}
              </span>
            </div>
          </div>
        </div>
      ))}

      {showReviewModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Viết đánh giá</h3>

            <div className="modal-product">
              <strong>{selectedProduct.product_name}</strong>
              <p>{selectedProduct.variant_info.color.name} - {selectedProduct.variant_info.size.name}</p>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Số sao</label>
                <div className="star-picker">
                  {[1,2,3,4,5].map(s => (
                    <span
                      key={s}
                      className={s <= reviewForm.rating ? 'active' : ''}
                      onClick={() => setReviewForm({...reviewForm, rating: s})}
                    >★</span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Loại</label>
                <select
                  value={reviewForm.feedback_type}
                  onChange={e => setReviewForm({...reviewForm, feedback_type: e.target.value})}
                >
                  {FEEDBACK_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nội dung</label>
                <textarea
                  value={reviewForm.content}
                  onChange={e => setReviewForm({...reviewForm, content: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowReviewModal(false)} className="btn-cancel">Hủy</button>
                <button type="submit" className="btn-submit">Gửi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}