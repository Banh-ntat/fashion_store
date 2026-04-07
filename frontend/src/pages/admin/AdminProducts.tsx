import { useState, useEffect } from 'react';
import { admin, categories, colors as colorsApi, sizes as sizesApi, variants as variantsApi } from '../../api/client';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: { id: number; name: string };
  promotion: { id: number; name: string } | null;
  variants?: Variant[];
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Color {
  id: number;
  name: string;
  code: string;
}

interface Size {
  id: number;
  name: string;
}

interface Variant {
  id: number;
  color: Color;
  size: Size;
  stock: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: number;
  promotion_id: number | null;
  upload_images?: File[];
}

interface VariantFormData {
  color_id: number;
  size_id: number;
  stock: number;
}

function getApiErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra!'): string {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  if (!responseData) return fallback;
  if (typeof responseData === 'string') return responseData;
  if (Array.isArray(responseData) && typeof responseData[0] === 'string') return responseData[0];
  if (typeof responseData === 'object') {
    if ('detail' in responseData && typeof (responseData as { detail?: unknown }).detail === 'string') {
      return (responseData as { detail: string }).detail;
    }
    const firstValue = Object.values(responseData as Record<string, unknown>)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
  }
  return fallback;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [colorsList, setColorsList] = useState<Color[]>([]);
  const [sizesList, setSizesList] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  
  // Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: 0,
    promotion_id: null,
    upload_images: [],
  });

  // Variant Modal
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<Variant[]>([]);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>({
    color_id: 0,
    size_id: 0,
    stock: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = (search?: string, lowStock?: boolean) => {
    const q = search !== undefined ? search : searchQuery;
    const low = lowStock !== undefined ? lowStock : lowStockOnly;
    const params: Record<string, string> = {};
    if (q.trim()) params.search = q.trim();
    if (low) {
      params.low_stock = 'true';
      params.stock_threshold = '5';
    }

    Promise.all([
      admin.products.list(Object.keys(params).length ? params : undefined),
      categories.list(),
      colorsApi.list(),
      sizesApi.list(),
    ])
      .then(([productsRes, categoriesRes, colorsRes, sizesRes]) => {
        const pdata = productsRes.data as { results?: Product[] };
        setProducts(pdata.results || (productsRes.data as Product[]) || []);
        setCategoriesList(categoriesRes.data.results || categoriesRes.data);
        setColorsList(colorsRes.data.results || colorsRes.data);
        setSizesList(sizesRes.data.results || sizesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const applyProductFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery, lowStockOnly);
  };

  // Product handlers
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category_id', formData.category_id.toString());
      if (formData.promotion_id) {
        formDataToSend.append('promotion_id', formData.promotion_id.toString());
      }

      // Append images
      if (formData.upload_images && formData.upload_images.length > 0) {
        formData.upload_images.forEach((file) => {
          formDataToSend.append('upload_images', file);
        });
      }

      if (editingProduct) {
        await admin.products.update(editingProduct.id, formDataToSend);
      } else {
        await admin.products.create(formDataToSend);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', category_id: 0, promotion_id: null, upload_images: [] });
      loadData();
    } catch (error) {
      alert(getApiErrorMessage(error));
      return;
      alert('Có lỗi xảy ra!');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.category.id,
      promotion_id: product.promotion?.id || null,
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await admin.products.delete(id);
        loadData();
      } catch {
        alert('Có lỗi xảy ra!');
      }
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', category_id: 0, promotion_id: null, upload_images: [] });
    setShowProductModal(true);
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setFormData({ ...formData, upload_images: files });
    }
  };

  // Variant handlers
  const openVariantModal = async (product: Product) => {
    setSelectedProduct(product);
    setEditingVariant(null);
    setVariantForm({ color_id: 0, size_id: 0, stock: 0 });
    
    // Load variants for this product
    try {
      const res = await variantsApi.list({ product: product.id });
      setProductVariants(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      setProductVariants([]);
    }
    
    setShowVariantModal(true);
  };

  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      if (editingVariant) {
        await admin.variants.update(editingVariant.id, {
          product_id: selectedProduct.id,
          ...variantForm,
        });
      } else {
        await admin.variants.create({
          product_id: selectedProduct.id,
          ...variantForm,
        });
      }
      
      // Reload variants
      const res = await variantsApi.list({ product: selectedProduct.id });
      setProductVariants(res.data.results || res.data);
      
      setVariantForm({ color_id: 0, size_id: 0, stock: 0 });
      setEditingVariant(null);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(msg || 'Có lỗi xảy ra!');
    }
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setVariantForm({
      color_id: variant.color.id,
      size_id: variant.size.id,
      stock: variant.stock,
    });
  };

  const handleDeleteVariant = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa biến thể này?')) {
      try {
        await admin.variants.delete(id);
        if (selectedProduct) {
          const res = await variantsApi.list({ product: selectedProduct.id });
          setProductVariants(res.data.results || res.data);
        }
      } catch {
        alert('Có lỗi xảy ra!');
      }
    }
  };

  // Color/Size quick add
  const [showQuickAddColor, setShowQuickAddColor] = useState(false);
  const [showQuickAddSize, setShowQuickAddSize] = useState(false);
  const [quickAddColorName, setQuickAddColorName] = useState('');
  const [quickAddColorCode, setQuickAddColorCode] = useState('#000000');
  const [quickAddSizeName, setQuickAddSizeName] = useState('');

  const handleQuickAddColor = async () => {
    if (!quickAddColorName.trim()) return;
    try {
      await admin.colors.create({ name: quickAddColorName.trim(), code: quickAddColorCode });
      const res = await colorsApi.list();
      setColorsList(res.data.results || res.data);
      setQuickAddColorName('');
      setShowQuickAddColor(false);
    } catch {
      alert('Có lỗi xảy ra!');
    }
  };

  const handleQuickAddSize = async () => {
    if (!quickAddSizeName.trim()) return;
    try {
      await admin.sizes.create({ name: quickAddSizeName.trim() });
      const res = await sizesApi.list();
      setSizesList(res.data.results || res.data);
      setQuickAddSizeName('');
      setShowQuickAddSize(false);
    } catch {
      alert('Có lỗi xảy ra!');
    }
  };

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h3>Quản lý sản phẩm</h3>
          <button className="btn-primary" onClick={openAddProductModal}>
            + Thêm sản phẩm
          </button>
        </div>

        <form className="admin-filters" onSubmit={applyProductFilters}>
          <input
            type="search"
            placeholder="Tìm theo tên, mô tả, danh mục…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: '240px', flex: 1 }}
          />
          <label className="admin-inlineCheck">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />{' '}
            Chỉ SP có biến thể tồn ≤ 5
          </label>
          <button type="submit" className="btn-primary">
            Lọc
          </button>
        </form>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Biến thể</th>
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
                <td>
                  <button 
                    className="btn-variant" 
                    onClick={() => openVariantModal(product)}
                  >
                    Quản lý ({product.variants?.length || 0})
                  </button>
                </td>
                <td>
                  <button className="btn-edit" onClick={() => handleEditProduct(product)}>
                    Sửa
                  </button>
                  <button className="btn-delete" onClick={() => handleDeleteProduct(product.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Product Modal */}
        {showProductModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
              <form onSubmit={handleSubmitProduct}>
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
                <div className="form-group">
                  <label>Hình ảnh sản phẩm</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                  {formData.upload_images && formData.upload_images.length > 0 && (
                    <div className="image-preview-list">
                      {formData.upload_images.map((file, index) => (
                        <div key={index} className="image-preview-item">
                          <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowProductModal(false)}>
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

        {/* Variant Modal */}
        {showVariantModal && selectedProduct && (
          <div className="modal-overlay">
            <div className="modal modal-large">
              <h3>Quản lý biến thể - {selectedProduct.name}</h3>
              
              {/* Quick Add Color/Size */}
              <div className="quick-add-row">
                {!showQuickAddColor ? (
                  <button className="btn-quick-add" onClick={() => setShowQuickAddColor(true)}>
                    + Thêm màu mới
                  </button>
                ) : (
                  <div className="quick-add-form">
                    <input
                      type="text"
                      placeholder="Tên màu"
                      value={quickAddColorName}
                      onChange={(e) => setQuickAddColorName(e.target.value)}
                    />
                    <input
                      type="color"
                      value={quickAddColorCode}
                      onChange={(e) => setQuickAddColorCode(e.target.value)}
                    />
                    <button className="btn-primary btn-sm" onClick={handleQuickAddColor}>Lưu</button>
                    <button className="btn-secondary btn-sm" onClick={() => setShowQuickAddColor(false)}>Hủy</button>
                  </div>
                )}
                
                {!showQuickAddSize ? (
                  <button className="btn-quick-add" onClick={() => setShowQuickAddSize(true)}>
                    + Thêm size mới
                  </button>
                ) : (
                  <div className="quick-add-form">
                    <input
                      type="text"
                      placeholder="Tên size"
                      value={quickAddSizeName}
                      onChange={(e) => setQuickAddSizeName(e.target.value)}
                    />
                    <button className="btn-primary btn-sm" onClick={handleQuickAddSize}>Lưu</button>
                    <button className="btn-secondary btn-sm" onClick={() => setShowQuickAddSize(false)}>Hủy</button>
                  </div>
                )}
              </div>

              {/* Variant Form */}
              <form onSubmit={handleSubmitVariant} className="variant-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Màu sắc</label>
                    <select
                      value={variantForm.color_id}
                      onChange={(e) => setVariantForm({ ...variantForm, color_id: Number(e.target.value) })}
                      required
                    >
                      <option value="">Chọn màu</option>
                      {colorsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Size</label>
                    <select
                      value={variantForm.size_id}
                      onChange={(e) => setVariantForm({ ...variantForm, size_id: Number(e.target.value) })}
                      required
                    >
                      <option value="">Chọn size</option>
                      {sizesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tồn kho</label>
                    <input
                      type="number"
                      min="0"
                      value={variantForm.stock}
                      onChange={(e) => setVariantForm({ ...variantForm, stock: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      {editingVariant ? 'Cập nhật' : 'Thêm biến thể'}
                    </button>
                    {editingVariant && (
                      <button 
                        type="button" 
                        className="btn-secondary"
                        onClick={() => {
                          setEditingVariant(null);
                          setVariantForm({ color_id: 0, size_id: 0, stock: 0 });
                        }}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Variants List */}
              <table className="data-table variant-table">
                <thead>
                  <tr>
                    <th>Màu sắc</th>
                    <th>Size</th>
                    <th>Tồn kho</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {productVariants.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>
                        Chưa có biến thể nào. Thêm biến thể bên trên.
                      </td>
                    </tr>
                  ) : (
                    productVariants.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <span 
                            className="color-dot" 
                            style={{ backgroundColor: v.color.code }}
                          />
                          {v.color.name}
                        </td>
                        <td>{v.size.name}</td>
                        <td>{v.stock}</td>
                        <td>
                          <button className="btn-edit" onClick={() => handleEditVariant(v)}>
                            Sửa
                          </button>
                          <button className="btn-delete" onClick={() => handleDeleteVariant(v.id)}>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => setShowVariantModal(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
