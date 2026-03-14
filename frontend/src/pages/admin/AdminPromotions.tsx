import { useState, useEffect } from 'react';
import { admin } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

interface Promotion {
  id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
}

interface PromotionFormData {
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>({
    name: '',
    discount_percent: 0,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = () => {
    admin.promotions
      .list()
      .then((res) => {
        setPromotions(res.data.results || res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await admin.promotions.update(editingPromotion.id, formData);
      } else {
        await admin.promotions.create(formData);
      }
      setShowModal(false);
      setEditingPromotion(null);
      setFormData({ name: '', discount_percent: 0, start_date: '', end_date: '' });
      loadPromotions();
    } catch {
      alert('Có lỗi xảy ra!');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      discount_percent: promotion.discount_percent,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa khuyến mãi này?')) {
      try {
        await admin.promotions.delete(id);
        loadPromotions();
      } catch {
        alert('Có lỗi xảy ra!');
      }
    }
  };

  const openAddModal = () => {
    setEditingPromotion(null);
    setFormData({ name: '', discount_percent: 0, start_date: '', end_date: '' });
    setShowModal(true);
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý khuyến mãi</h3>
          <button className="btn-primary" onClick={openAddModal}>
            + Thêm khuyến mãi
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên khuyến mãi</th>
              <th>Giảm giá (%)</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion) => (
              <tr key={promotion.id}>
                <td>{promotion.id}</td>
                <td>{promotion.name}</td>
                <td>{promotion.discount_percent}%</td>
                <td>{new Date(promotion.start_date).toLocaleDateString('vi-VN')}</td>
                <td>{new Date(promotion.end_date).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(promotion)}>
                    Sửa
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(promotion.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>{editingPromotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Tên khuyến mãi</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Giảm giá (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
