import { useState, useEffect } from 'react';
import { admin, categories } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: { id: number; name: string };
  promotion: { id: number; name: string } | null;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: number;
  promotion_id: number | null;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: 0,
    promotion_id: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([admin.products.list(), categories.list()])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data.results || productsRes.data);
        setCategoriesList(categoriesRes.data.results || categoriesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await admin.products.update(editingProduct.id, formData);
      } else {
        await admin.products.create(formData);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', category_id: 0, promotion_id: null });
      loadData();
    } catch (error) {
      alert('Có lỗi xảy ra!');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.category.id,
      promotion_id: product.promotion?.id || null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await admin.products.delete(id);
        loadData();
      } catch {
        alert('Có lỗi xảy ra!');
      }
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', category_id: 0, promotion_id: null });
    setShowModal(true);
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý sản phẩm</h3>
          <button className="btn-primary" onClick={openAddModal}>
            + Thêm sản phẩm
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Khuyến mãi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.category.name}</td>
                <td>${product.price}</td>
                <td>{product.promotion?.name || '-'}</td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(product)}>
                    Sửa
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(product.id)}>
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
              <h3>{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Tên sản phẩm</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Giá</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Danh mục</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
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
