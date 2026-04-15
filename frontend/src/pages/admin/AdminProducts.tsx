import { useState, useEffect, useRef } from "react";
import {
  admin,
  categories,
  colors as colorsApi,
  sizes as sizesApi,
  variants as variantsApi,
} from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import "./Admin.css";

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: { id: number; name: string };
  promotion: { id: number; name: string } | null;
  variants?: Variant[];
  image?: string;
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

function getApiErrorMessage(
  error: unknown,
  fallback = "Có lỗi xảy ra!",
): string {
  const responseData = (error as { response?: { data?: unknown } })?.response
    ?.data;
  if (!responseData) return fallback;
  if (typeof responseData === "string") return responseData;
  if (Array.isArray(responseData) && typeof responseData[0] === "string")
    return responseData[0];
  if (typeof responseData === "object") {
    if (
      "detail" in responseData &&
      typeof (responseData as { detail?: unknown }).detail === "string"
    ) {
      return (responseData as { detail: string }).detail;
    }
    const firstValue = Object.values(
      responseData as Record<string, unknown>,
    )[0];
    if (typeof firstValue === "string") return firstValue;
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string")
      return firstValue[0];
  }
  return fallback;
}

function variantStockTone(stock: number): "empty" | "low" | "ok" {
  if (stock <= 0) return "empty";
  if (stock <= 5) return "low";
  return "ok";
}

function productImageGallery(p: Product): string[] {
  const fromDb = (p.images ?? [])
    .map((x) => x.image)
    .filter((u): u is string => Boolean(u));
  if (fromDb.length > 0) return fromDb;
  if (p.image) return [p.image];
  return [];
}

export default function AdminProducts() {
  const { user } = useAuth();
  const canManageVariantStock = user?.is_admin === true;

  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [colorsList, setColorsList] = useState<Color[]>([]);
  const [sizesList, setSizesList] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [promotionsList, setPromotionsList] = useState<
    { id: number; name: string; discount_percent: number; is_active: boolean }[]
  >([]);

  // Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "",
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
  const [warehouseDelta, setWarehouseDelta] = useState("");
  const [variantImageIndex, setVariantImageIndex] = useState(0);
  const variantFormPanelRef = useRef<HTMLElement | null>(null);
  const variantColorSelectRef = useRef<HTMLSelectElement | null>(null);

  const loadData = (search?: string, lowStock?: boolean) => {
    const q = search !== undefined ? search : searchQuery;
    const low = lowStock !== undefined ? lowStock : lowStockOnly;
    const params: Record<string, string> = {};
    if (q.trim()) params.search = q.trim();
    if (low) {
      params.low_stock = "true";
      params.stock_threshold = "5";
    }

    Promise.all([
      admin.products.list(Object.keys(params).length ? params : undefined),
      categories.list(),
      colorsApi.list(),
      sizesApi.list(),
      admin.promotions.list(),
    ])
      .then(
        ([productsRes, categoriesRes, colorsRes, sizesRes, promotionsRes]) => {
          const pdata = productsRes.data as { results?: Product[] };
          setProducts(pdata.results || (productsRes.data as Product[]) || []);
          setCategoriesList(categoriesRes.data.results || categoriesRes.data);
          setColorsList(colorsRes.data.results || colorsRes.data);
          setSizesList(sizesRes.data.results || sizesRes.data);
          const prom = promotionsRes.data as
            | { results?: typeof promotionsList }
            | typeof promotionsList;
          setPromotionsList(Array.isArray(prom) ? prom : (prom.results ?? []));
        },
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showVariantModal && selectedProduct?.id) {
      setVariantImageIndex(0);
    }
  }, [showVariantModal, selectedProduct?.id]);

  const applyProductFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery, lowStockOnly);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("price", formData.price);
      formDataToSend.append("category_id", formData.category_id.toString());
      if (formData.promotion_id) {
        formDataToSend.append("promotion_id", formData.promotion_id.toString());
      }
      if (formData.upload_images && formData.upload_images.length > 0) {
        formData.upload_images.forEach((file) => {
          formDataToSend.append("upload_images", file);
        });
      }
      if (editingProduct) {
        await admin.products.update(editingProduct.id, formDataToSend);
      } else {
        await admin.products.create(formDataToSend);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        category_id: 0,
        promotion_id: null,
        upload_images: [],
      });
      loadData();
    } catch (error) {
      alert(getApiErrorMessage(error));
      return;
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
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      try {
        await admin.products.delete(id);
        loadData();
      } catch {
        alert("Có lỗi xảy ra!");
      }
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: 0,
      promotion_id: null,
      upload_images: [],
    });
    setShowProductModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setFormData({ ...formData, upload_images: files });
    }
  };

  const openVariantModal = async (product: Product) => {
    setEditingVariant(null);
    setVariantForm({ color_id: 0, size_id: 0, stock: 0 });
    setWarehouseDelta("");
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
    if (!canManageVariantStock) return;

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

      const res = await variantsApi.list({ product: selectedProduct.id });
      setProductVariants(res.data.results || res.data);

      setVariantForm({ color_id: 0, size_id: 0, stock: 0 });
      setWarehouseDelta("");
      setEditingVariant(null);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      alert(msg || "Có lỗi xảy ra!");
    }
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setWarehouseDelta("");
    setVariantForm({
      color_id: variant.color.id,
      size_id: variant.size.id,
      stock: variant.stock,
    });
    window.setTimeout(() => {
      variantFormPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      variantColorSelectRef.current?.focus({ preventScroll: false });
    }, 0);
  };

  const applyWarehouseDelta = () => {
    const raw = warehouseDelta.trim();
    if (raw === "") return;
    const d = Number(raw);
    if (Number.isNaN(d) || !Number.isFinite(d)) {
      alert("Nhập số hợp lệ (có thể âm khi điều chỉnh giảm).");
      return;
    }
    setVariantForm((f) => ({ ...f, stock: Math.max(0, Math.round(f.stock + d)) }));
    setWarehouseDelta("");
  };

  const bumpStock = (delta: number) => {
    setVariantForm((f) => ({ ...f, stock: Math.max(0, f.stock + delta) }));
  };

  const handleDeleteVariant = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa biến thể này?")) {
      try {
        await admin.variants.delete(id);
        if (selectedProduct) {
          const res = await variantsApi.list({ product: selectedProduct.id });
          setProductVariants(res.data.results || res.data);
        }
      } catch {
        alert("Có lỗi xảy ra!");
      }
    }
  };

  const [showQuickAddColor, setShowQuickAddColor] = useState(false);
  const [showQuickAddSize, setShowQuickAddSize] = useState(false);
  const [quickAddColorName, setQuickAddColorName] = useState("");
  const [quickAddColorCode, setQuickAddColorCode] = useState("#000000");
  const [quickAddSizeName, setQuickAddSizeName] = useState("");

  const handleQuickAddColor = async () => {
    if (!quickAddColorName.trim()) return;
    try {
      await admin.colors.create({
        name: quickAddColorName.trim(),
        code: quickAddColorCode,
      });
      const res = await colorsApi.list();
      setColorsList(res.data.results || res.data);
      setQuickAddColorName("");
      setShowQuickAddColor(false);
    } catch {
      alert("Có lỗi xảy ra!");
    }
  };

  const handleQuickAddSize = async () => {
    if (!quickAddSizeName.trim()) return;
    try {
      await admin.sizes.create({ name: quickAddSizeName.trim() });
      const res = await sizesApi.list();
      setSizesList(res.data.results || res.data);
      setQuickAddSizeName("");
      setShowQuickAddSize(false);
    } catch {
      alert("Có lỗi xảy ra!");
    }
  };

  if (loading)
    return (
      <AdminLayout>
        <div className="loading">Loading...</div>
      </AdminLayout>
    );

  const variantGallery =
    showVariantModal && selectedProduct
      ? productImageGallery(selectedProduct)
      : [];
  const variantMainSrc =
    variantGallery[variantImageIndex] ?? variantGallery[0] ?? "";

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <div>
            <h3>Quản lý sản phẩm</h3>
            <p className="page-header-desc">
              {canManageVariantStock ? (
                <>
                  Tồn kho theo màu &amp; size không hiện trên bảng — bấm nút tím{" "}
                  <strong className="page-header-desc-em">Biến thể</strong> trên từng sản phẩm để
                  nhập kho / chỉnh số lượng trong cửa sổ.
                </>
              ) : (
                <>
                  Bấm <strong className="page-header-desc-em">Biến thể</strong> để{" "}
                  <strong>xem</strong> tồn theo màu &amp; size (nhân viên chỉ xem; nhập kho do quản trị
                  viên).
                </>
              )}
            </p>
          </div>
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
            style={{ minWidth: "240px", flex: 1 }}
          />
          <label className="admin-inlineCheck">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />{" "}
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
                    <span className="btn-variant__icon" aria-hidden>◎</span>
                    <span className="btn-variant__text">Biến thể</span>
                    <span className="btn-variant__count">
                      {product.variants?.length ?? 0}
                    </span>
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
              <h3>{editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h3>
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
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: Number(e.target.value) })
                    }
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Khuyến mãi</label>
                  <select
                    value={formData.promotion_id ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        promotion_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">Không có khuyến mãi</option>
                    {promotionsList
                      .filter((p) => p.is_active || p.id === formData.promotion_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (-{p.discount_percent}%)
                          {!p.is_active ? " [Hết hạn]" : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hình ảnh sản phẩm</label>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
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
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowProductModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">Lưu</button>
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
              {/* ── Layout hàng ngang: ảnh trái | nội dung phải ── */}
              <div className="variant-modal__layout">

                {/* Cột trái — ảnh + thumbnail */}
                <aside className="variant-modal__media">
                  {variantMainSrc ? (
                    <>
                      <div className="variant-modal__preview-main">
                        <img src={variantMainSrc} alt="" loading="lazy" decoding="async" />
                      </div>
                      {variantGallery.length > 1 && (
                        <div
                          className="variant-modal__thumbs"
                          role="tablist"
                          aria-label="Ảnh sản phẩm"
                        >
                          {variantGallery.map((url, idx) => (
                            <button
                              key={`${url}-${idx}`}
                              type="button"
                              role="tab"
                              aria-selected={variantImageIndex === idx}
                              className={`variant-modal__thumb ${variantImageIndex === idx ? "is-active" : ""}`}
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
                </aside>

                {/* Cột phải — header + body cuộn */}
                <div className="variant-modal__content">

                  {/* Header gọn */}
                  <div className="variant-modal__header">
                    <div>
                      <h3 id="variant-modal-title">
                        {canManageVariantStock ? "Biến thể & nhập kho" : "Biến thể (chỉ xem tồn)"}
                      </h3>
                      <p className="variant-modal__product-name">{selectedProduct.name}</p>
                    </div>
                    <span className="variant-modal__badge" title="Số biến thể">
                      {productVariants.length} SKU
                    </span>
                  </div>

                  {/* Body cuộn */}
                  <div className="variant-modal__body">

                    {!canManageVariantStock && (
                      <div
                        className="admin-banner variant-modal__staff-readonly-banner"
                        role="status"
                      >
                        <strong>Nhân viên:</strong> chỉ xem tồn theo màu &amp; size. Thêm/sửa/xóa biến thể
                        và nhập kho do <strong>quản trị viên</strong> thực hiện.
                      </div>
                    )}

                    {canManageVariantStock && (
                      <section
                        className="variant-modal__panel variant-modal__panel--quick"
                        aria-label="Thêm nhanh màu và size"
                      >
                        <h4 className="variant-modal__panel-title">Mở rộng danh mục dùng chung</h4>
                        <p className="variant-modal__hint">
                          Thêm màu hoặc size mới để chọn ở form bên dưới (áp dụng cho toàn cửa hàng).
                        </p>
                        <div className="variant-quick-grid">
                          <div className="variant-quick-card">
                            <div className="variant-quick-card__label">
                              <span className="variant-quick-card__dot" style={{ background: "#6366f1" }} aria-hidden />
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
                                  <button type="button" className="btn-primary btn-sm" onClick={handleQuickAddColor}>Lưu</button>
                                  <button type="button" className="btn-secondary btn-sm" onClick={() => setShowQuickAddColor(false)}>Hủy</button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="variant-quick-card">
                            <div className="variant-quick-card__label">
                              <span className="variant-quick-card__dot" style={{ background: "#0ea5e9" }} aria-hidden />
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
                                  <button type="button" className="btn-primary btn-sm" onClick={handleQuickAddSize}>Lưu</button>
                                  <button type="button" className="btn-secondary btn-sm" onClick={() => setShowQuickAddSize(false)}>Hủy</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    {canManageVariantStock && (
                      <section
                        ref={variantFormPanelRef}
                        className="variant-modal__panel variant-modal__panel--form"
                        aria-label="Thêm hoặc sửa biến thể"
                      >
                        <h4 className="variant-modal__panel-title">
                          {editingVariant ? "Cập nhật biến thể & tồn" : "Thêm biến thể mới"}
                        </h4>
                        <p className="variant-stock-workflow-hint">
                          {editingVariant
                            ? "Chọn đúng màu/size của SKU, chỉnh « Tồn kho » trực tiếp hoặc « Nhập thêm » rồi Lưu."
                            : "Chọn màu, size và tồn ban đầu; sau này mở lại đây để nhập thêm hàng."}
                        </p>
                        <form onSubmit={handleSubmitVariant} className="variant-form-compact">
                          <div className="variant-form-compact__grid">
                            <div className="form-group">
                              <label htmlFor="vf-color">Màu</label>
                              <select
                                ref={variantColorSelectRef}
                                id="vf-color"
                                value={variantForm.color_id || ""}
                                onChange={(e) =>
                                  setVariantForm({ ...variantForm, color_id: Number(e.target.value) })
                                }
                                required
                              >
                                <option value="" disabled>Chọn màu</option>
                                {colorsList.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label htmlFor="vf-size">Size</label>
                              <select
                                id="vf-size"
                                value={variantForm.size_id || ""}
                                onChange={(e) =>
                                  setVariantForm({ ...variantForm, size_id: Number(e.target.value) })
                                }
                                required
                              >
                                <option value="" disabled>Chọn size</option>
                                {sizesList.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group form-group--stock">
                              <label htmlFor="vf-stock">
                                {editingVariant ? "Tồn kho (sau cập nhật)" : "Tồn kho ban đầu"}
                              </label>
                              <input
                                id="vf-stock"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={variantForm.stock}
                                onChange={(e) =>
                                  setVariantForm({
                                    ...variantForm,
                                    stock: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                required
                              />
                              <div className="variant-stock-quick" role="group" aria-label="Cộng nhanh vào tồn">
                                <span className="variant-stock-quick__label">Cộng nhanh:</span>
                                {[1, 5, 10, 50, 100].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    className="variant-stock-quick__btn"
                                    onClick={() => bumpStock(n)}
                                  >
                                    +{n}
                                  </button>
                                ))}
                              </div>
                              <div className="variant-stock-inbound">
                                <label htmlFor="vf-warehouse-delta">Nhập thêm vào kho</label>
                                <div className="variant-stock-inbound__row">
                                  <input
                                    id="vf-warehouse-delta"
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="VD: 20 hoặc -3"
                                    value={warehouseDelta}
                                    onChange={(e) => setWarehouseDelta(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={applyWarehouseDelta}
                                  >
                                    Áp dụng
                                  </button>
                                </div>
                                <p className="variant-stock-inbound__hint">
                                  Số dương = nhập thêm; số âm = trừ tồn (kiểm kê). Bấm Áp dụng để cộng vào ô tồn phía trên, rồi Lưu.
                                </p>
                              </div>
                            </div>
                            <div className="variant-form-compact__submit">
                              <button type="submit" className="btn-primary variant-form-compact__btn-main">
                                {editingVariant ? "Lưu thay đổi" : "Thêm biến thể"}
                              </button>
                              {editingVariant && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => {
                                    setEditingVariant(null);
                                    setWarehouseDelta("");
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
                    )}

                    <section className="variant-modal__panel" aria-label="Danh sách biến thể">
                      <div className="variant-modal__list-head">
                        <h4 className="variant-modal__panel-title variant-modal__panel-title--inline">
                          {canManageVariantStock ? "Danh sách" : "Danh sách (màu · size · tồn)"}
                        </h4>
                        <p className="variant-modal__legend">
                          Ô tồn:{" "}
                          <span className="variant-legend-tag variant-legend-tag--ok">đủ</span>
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
                              {canManageVariantStock && (
                                <th className="variant-table__actions">Thao tác</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {productVariants.length === 0 ? (
                              <tr>
                                <td colSpan={canManageVariantStock ? 4 : 3}>
                                  <div className="variant-empty">
                                    <p className="variant-empty__title">Chưa có biến thể</p>
                                    <p className="variant-empty__text">
                                      {canManageVariantStock
                                        ? "Chọn màu, size và tồn kho ở form phía trên rồi bấm « Thêm biến thể »."
                                        : "Chưa có SKU — quản trị viên thêm biến thể và tồn kho."}
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
                                    <span className={`variant-stock variant-stock--${variantStockTone(v.stock)}`}>
                                      {v.stock}
                                    </span>
                                  </td>
                                  {canManageVariantStock && (
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
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                  </div>{/* /variant-modal__body */}
                </div>{/* /variant-modal__content */}
              </div>{/* /variant-modal__layout */}

              <div className="variant-modal__footer">
                <button
                  type="button"
                  className="btn-secondary variant-modal__close"
                  onClick={() => setShowVariantModal(false)}
                >
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