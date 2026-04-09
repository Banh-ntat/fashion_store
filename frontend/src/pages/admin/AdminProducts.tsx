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
  /** Ảnh đại diện (URL đầy đủ từ API) */
  image?: string;
  /** Danh sách ảnh gallery */
  images?: { id: number; image: string | null }[];
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

function variantStockTone(stock: number): 'empty' | 'low' | 'ok' {
  if (stock <= 0) return 'empty';
  if (stock <= 5) return 'low';
  return 'ok';
}

/** URL ảnh hiển thị trong modal biến thể (ưu tiên gallery từ API) */
function productImageGallery(p: Product): string[] {
  const fromDb = (p.images ?? []).map((x) => x.image).filter((u): u is string => Boolean(u));
  if (fromDb.length > 0) return fromDb;
  if (p.image) return [p.image];
  return [];
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
  /** Ảnh đang xem trong modal biến thể (khi có nhiều ảnh) */
  const [variantImageIndex, setVariantImageIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showVariantModal && selectedProduct?.id) {
      setVariantImageIndex(0);
    }
  }, [showVariantModal, selectedProduct?.id]);

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
    setEditingVariant(null);
    setVariantForm({ color_id: 0, size_id: 0, stock: 0 });
    setSelectedProduct(product);
    setVariantImageIndex(0);

    try {
      const [detailRes, varRes] = await Promise.all([
        admin.products.get(product.id),
        variantsApi.list({ product: product.id }),
      ]);
      const detail = detailRes.data as Product;
      setSelectedProduct({ ...product, ...detail });
      setProductVariants(varRes.data.results || varRes.data);
    } catch (err) {
      console.error(err);
      try {
        const res = await variantsApi.list({ product: product.id });
        setProductVariants(res.data.results || res.data);
      } catch {
        setProductVariants([]);
      }
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

  const variantGallery =
    showVariantModal && selectedProduct ? productImageGallery(selectedProduct) : [];
  const variantMainSrc =
    variantGallery[variantImageIndex] ?? variantGallery[0] ?? '';

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
                    type="button"
                    className="btn-variant"
                    onClick={() => openVariantModal(product)}
                  >
                    <span className="btn-variant__icon" aria-hidden>
                      ◎
                    </span>
                    <span className="btn-variant__text">Biến thể</span>
                    <span className="btn-variant__count">{product.variants?.length ?? 0}</span>
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
          <div
            className="modal-overlay variant-modal-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowVariantModal(false);
            }}
          >
            <div
              className="modal modal-large variant-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="variant-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="variant-modal__head variant-modal__head--media">
                <div className="variant-modal__preview">
                  {variantMainSrc ? (
                    <>
                      <div className="variant-modal__preview-main">
                        <img src={variantMainSrc} alt="" loading="lazy" decoding="async" />
                      </div>
                      {variantGallery.length > 1 && (
                        <div className="variant-modal__thumbs" role="tablist" aria-label="Ảnh sản phẩm">
                          {variantGallery.map((url, idx) => (
                            <button
                              key={`${url}-${idx}`}
                              type="button"
                              role="tab"
                              aria-selected={variantImageIndex === idx}
                              className={`variant-modal__thumb ${variantImageIndex === idx ? 'is-active' : ''}`}
                              onClick={() => setVariantImageIndex(idx)}
                            >
                              <img src={url} alt="" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="variant-modal__preview-placeholder">
                      <span>Chưa có ảnh</span>
                      <small>Thêm ảnh khi sửa sản phẩm</small>
                    </div>
                  )}
                </div>
                <div className="variant-modal__head-main">
                  <div className="variant-modal__head-top">
                    <div>
                      <h3 id="variant-modal-title">Biến thể &amp; tồn kho</h3>
                      <p className="variant-modal__product-name">{selectedProduct.name}</p>
                    </div>
                    <span className="variant-modal__badge" title="Số biến thể">
                      {productVariants.length} SKU
                    </span>
                  </div>
                </div>
              </div>

              <section className="variant-modal__panel variant-modal__panel--quick" aria-label="Thêm nhanh màu và size">
                <h4 className="variant-modal__panel-title">Mở rộng danh mục dùng chung</h4>
                <p className="variant-modal__hint">
                  Thêm màu hoặc size mới để chọn ở form bên dưới (áp dụng cho toàn cửa hàng).
                </p>
                <div className="variant-quick-grid">
                  <div className="variant-quick-card">
                    <div className="variant-quick-card__label">
                      <span className="variant-quick-card__dot" style={{ background: '#6366f1' }} aria-hidden />
                      Màu sắc
                    </div>
                    {!showQuickAddColor ? (
                      <button
                        type="button"
                        className="variant-quick-card__trigger"
                        onClick={() => setShowQuickAddColor(true)}
                      >
                        + Thêm màu mới
                      </button>
                    ) : (
                      <div className="variant-quick-card__form">
                        <input
                          type="text"
                          placeholder="Tên màu (vd: Đỏ đô)"
                          value={quickAddColorName}
                          onChange={(e) => setQuickAddColorName(e.target.value)}
                          aria-label="Tên màu"
                        />
                        <label className="variant-quick-card__colorPick">
                          <span>Mã</span>
                          <input
                            type="color"
                            value={quickAddColorCode}
                            onChange={(e) => setQuickAddColorCode(e.target.value)}
                            title="Chọn màu"
                          />
                        </label>
                        <div className="variant-quick-card__actions">
                          <button type="button" className="btn-primary btn-sm" onClick={handleQuickAddColor}>
                            Lưu
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => setShowQuickAddColor(false)}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="variant-quick-card">
                    <div className="variant-quick-card__label">
                      <span className="variant-quick-card__dot" style={{ background: '#0ea5e9' }} aria-hidden />
                      Kích thước
                    </div>
                    {!showQuickAddSize ? (
                      <button
                        type="button"
                        className="variant-quick-card__trigger"
                        onClick={() => setShowQuickAddSize(true)}
                      >
                        + Thêm size mới
                      </button>
                    ) : (
                      <div className="variant-quick-card__form variant-quick-card__form--stack">
                        <input
                          type="text"
                          placeholder="Tên size (vd: M, 42)"
                          value={quickAddSizeName}
                          onChange={(e) => setQuickAddSizeName(e.target.value)}
                          aria-label="Tên size"
                        />
                        <div className="variant-quick-card__actions">
                          <button type="button" className="btn-primary btn-sm" onClick={handleQuickAddSize}>
                            Lưu
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => setShowQuickAddSize(false)}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="variant-modal__panel variant-modal__panel--form" aria-label="Thêm hoặc sửa biến thể">
                <h4 className="variant-modal__panel-title">
                  {editingVariant ? 'Cập nhật biến thể' : 'Thêm biến thể mới'}
                </h4>
                <form onSubmit={handleSubmitVariant} className="variant-form-compact">
                  <div className="variant-form-compact__grid">
                    <div className="form-group">
                      <label htmlFor="vf-color">Màu</label>
                      <select
                        id="vf-color"
                        value={variantForm.color_id || ''}
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, color_id: Number(e.target.value) })
                        }
                        required
                      >
                        <option value="" disabled>
                          Chọn màu
                        </option>
                        {colorsList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="vf-size">Size</label>
                      <select
                        id="vf-size"
                        value={variantForm.size_id || ''}
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, size_id: Number(e.target.value) })
                        }
                        required
                      >
                        <option value="" disabled>
                          Chọn size
                        </option>
                        {sizesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="vf-stock">Tồn kho</label>
                      <input
                        id="vf-stock"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={variantForm.stock}
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, stock: Number(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="variant-form-compact__submit">
                      <button type="submit" className="btn-primary variant-form-compact__btn-main">
                        {editingVariant ? 'Lưu thay đổi' : 'Thêm biến thể'}
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
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </section>

              <section className="variant-modal__panel" aria-label="Danh sách biến thể">
                <div className="variant-modal__list-head">
                  <h4 className="variant-modal__panel-title variant-modal__panel-title--inline">Danh sách</h4>
                  <p className="variant-modal__legend">
                    Ô tồn: <span className="variant-legend-tag variant-legend-tag--ok">đủ</span>
                    <span className="variant-legend-tag variant-legend-tag--low">thấp ≤5</span>
                    <span className="variant-legend-tag variant-legend-tag--empty">hết</span>
                  </p>
                </div>
                <div className="variant-table-wrap">
                  <table className="data-table variant-table">
                    <thead>
                      <tr>
                        <th>Màu</th>
                        <th>Size</th>
                        <th>Tồn</th>
                        <th className="variant-table__actions">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productVariants.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="variant-empty">
                              <p className="variant-empty__title">Chưa có biến thể</p>
                              <p className="variant-empty__text">
                                Chọn màu, size và tồn kho ở form phía trên rồi bấm « Thêm biến thể ».
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        productVariants.map((v) => (
                          <tr key={v.id}>
                            <td>
                              <div className="variant-cell-color">
                                <span
                                  className="color-dot color-dot--lg"
                                  style={{ backgroundColor: v.color.code }}
                                  title={v.color.name}
                                />
                                <span>{v.color.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="variant-size-pill">{v.size.name}</span>
                            </td>
                            <td>
                              <span
                                className={`variant-stock variant-stock--${variantStockTone(v.stock)}`}
                              >
                                {v.stock}
                              </span>
                            </td>
                            <td className="variant-table__actions">
                              <button
                                type="button"
                                className="btn-edit btn-edit--compact"
                                onClick={() => handleEditVariant(v)}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="btn-delete btn-delete--compact"
                                onClick={() => handleDeleteVariant(v.id)}
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="variant-modal__footer">
                <button type="button" className="btn-secondary variant-modal__close" onClick={() => setShowVariantModal(false)}>
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
