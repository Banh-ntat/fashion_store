import { useState, useEffect } from 'react';
import { admin } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

interface Review {
  id: number;
  user: { username: string };
  product: { name: string };
  rating: number;
  created_at: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = () => {
    admin.reviews
      .list()
      .then((res) => {
        const data = res?.data;
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setReviews(list);
      })
      .catch((err) => {
        console.error('Load reviews failed:', err);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      try {
        await admin.reviews.delete(id);
        loadReviews();
      } catch {
        alert('Có lỗi xảy ra!');
      }
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý đánh giá</h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Người dùng</th>
              <th>Sản phẩm</th>
              <th>Rating</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td>{review.id}</td>
                <td>{review.user?.username || 'N/A'}</td>
                <td>{review.product?.name || 'N/A'}</td>
                <td>
                  <span className="stars">{renderStars(review.rating)}</span>
                </td>
                <td>{new Date(review.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="btn-delete" onClick={() => handleDelete(review.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
