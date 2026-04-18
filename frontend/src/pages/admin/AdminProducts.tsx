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
  size_chart?: string | null;
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

// ✅ FIX: Thêm field `order` vào Size interface
interface Size {
  id: number;
  name: string;
  order: number;
}

interface Variant {
  id: number;
  color: Color;
  size: Size;
  stock: number;
  price: number | null;
  effective_price?: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: number;
  promotion_id: number | null;
  upload_images?: File[];
  size_chart?: File | null;
  clear_size_chart?: boolean;
  delete_image_ids?: number[];
}

interface VariantFormData {
  color_id: number;
  size_id: number;
  stock: number;
  price: number | null;
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

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "",
    category_id: 0,
    promotion_id: null,
    upload_images: [],
    size_chart: null,
  });

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<Variant[]>([]);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>({
    color_id: 0,
    size_id: 0,
    stock: 0,
    price: null,
  });
  const [warehouseDelta, setWarehouseDelta] = useState("");
  const [variantImageIndex, setVariantImageIndex] = useState(0);
  const variantFormPanelRef = useRef<HTMLElement | null>(null);
  const variantColorSelectRef = useRef<HTMLSelectElement | null>(null);

  // ✅ State cho quick-add màu
  const [showQuickAddColor, setShowQuickAddColor] = useState(false);
  const [quickAddColorName, setQuickAddColorName] = useState("");
  const [quickAddColorCode, setQuickAddColorCode] = useState("#000000");
  const [quickAddColorLoading, setQuickAddColorLoading] = useState(false);
  const [quickAddColorError, setQuickAddColorError] = useState("");

  // ✅ State cho quick-add size (tách riêng với order)
  const [showQuickAddSize, setShowQuickAddSize] = useState(false);
  const [quickAddSizeName, setQuickAddSizeName] = useState("");
  const [quickAddSizeOrder, setQuickAddSizeOrder] = useState(0);
  const [quickAddSizeLoading, setQuickAddSizeLoading] = useState(false);
  const [quickAddSizeError, setQuickAddSizeError] = useState("");

  // ✅ State cho chỉnh thứ tự size inline
  const [editingOrders, setEditingOrders] = useState<Record<number, number>>(
    {},
  );
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);

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
          const rawSizes: Size[] = sizesRes.data.results || sizesRes.data;
          setSizesList(
            [...rawSizes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
          );
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
      if (formData.size_chart) {
        formDataToSend.append("size_chart", formData.size_chart);
      }
      if (formData.clear_size_chart && !formData.size_chart) {
        formDataToSend.append("clear_size_chart", "true");
      }

      if (editingProduct) {
        if (formData.delete_image_ids && formData.delete_image_ids.length > 0) {
          await Promise.all(
            formData.delete_image_ids.map((imgId) =>
              fetch(`/api/products/images/${imgId}/`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
              }),
            ),
          );
        }
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
        size_chart: null,
        clear_size_chart: false,
        delete_image_ids: [],
      });
      loadData();
    } catch (error) {
      alert(getApiErrorMessage(error));
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
      upload_images: [],
      size_chart: null,
      clear_size_chart: false,
      delete_image_ids: [],
    });
    setShowProductModal(true);
  };

  const handleSizeChartUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData((prev) => ({ ...prev, size_chart: e.target.files![0] }));
    }
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
      size_chart: null,
      clear_size_chart: false,
      delete_image_ids: [],
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
    setVariantForm({ color_id: 0, size_id: 0, stock: 0, price: null });
    setWarehouseDelta("");
    setSelectedProduct(product);
    setVariantImageIndex(0);
    setShowQuickAddColor(false);
    setShowQuickAddSize(false);
    setQuickAddColorName("");
    setQuickAddColorCode("#000000");
    setQuickAddSizeName("");
    setQuickAddSizeOrder(0);
    setQuickAddColorError("");
    setQuickAddSizeError("");
    setEditingOrders({});

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

  const handleQuickAddColor = async () => {
    const name = quickAddColorName.trim();
    if (!name) {
      setQuickAddColorError("Vui lòng nhập tên màu.");
      return;
    }
    setQuickAddColorError("");
    setQuickAddColorLoading(true);
    try {
      await admin.colors.create({ name, code: quickAddColorCode });
      const res = await colorsApi.list();
      setColorsList(res.data.results || res.data);
      setQuickAddColorName("");
      setQuickAddColorCode("#000000");
      setShowQuickAddColor(false);
    } catch (error) {
      setQuickAddColorError(getApiErrorMessage(error, "Không thể thêm màu."));
    } finally {
      setQuickAddColorLoading(false);
    }
  };

  // ✅ FIX: handleQuickAddSize giờ gửi cả `order`
  const handleQuickAddSize = async () => {
    const name = quickAddSizeName.trim();
    if (!name) {
      setQuickAddSizeError("Vui lòng nhập tên size.");
      return;
    }
    setQuickAddSizeError("");
    setQuickAddSizeLoading(true);
    try {
      await admin.sizes.create({ name, order: quickAddSizeOrder });
      const res = await sizesApi.list();
      const rawSizes: Size[] = res.data.results || res.data;
      setSizesList(
        [...rawSizes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
      setQuickAddSizeName("");
      setQuickAddSizeOrder(0);
      setShowQuickAddSize(false);
    } catch (error) {
      setQuickAddSizeError(getApiErrorMessage(error, "Không thể thêm size."));
    } finally {
      setQuickAddSizeLoading(false);
    }
  };

  // ✅ Lưu thứ tự size ngay khi blur hoặc bấm Enter
  const handleSaveOrder = async (s: Size, newOrder: number) => {
    setSavingOrderId(s.id);
    try {
      await admin.sizes.update(s.id, { name: s.name, order: newOrder });
      const res = await sizesApi.list();
      const rawSizes: Size[] = res.data.results || res.data;
      setSizesList(
        [...rawSizes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
      setEditingOrders((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
    } catch {
      alert("Không thể lưu thứ tự size.");
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!canManageVariantStock) return;

    const variantPayload = {
      product_id: selectedProduct.id,
      color_id: variantForm.color_id,
      size_id: variantForm.size_id,
      stock: variantForm.stock,
      price: variantForm.price,
    };

    try {
      if (editingVariant) {
        await admin.variants.update(editingVariant.id, variantPayload);
      } else {
        await admin.variants.create(variantPayload);
      }

      const res = await variantsApi.list({ product: selectedProduct.id });
      setProductVariants(res.data.results || res.data);

      setVariantForm({ color_id: 0, size_id: 0, stock: 0, price: null });
      setWarehouseDelta("");
      setEditingVariant(null);
    } catch (error: unknown) {
      console.error("Variant error:", (error as any)?.response?.data);
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
      price: variant.price ?? null,
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
    setVariantForm((f) => ({
      ...f,
      stock: Math.max(0, Math.round(f.stock + d)),
    }));
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
                  <strong className="page-header-desc-em">Biến thể</strong> trên
                  từng sản phẩm để nhập kho / chỉnh số lượng trong cửa sổ.
                </>
              ) : (
                <>
                  Bấm <strong className="page-header-desc-em">Biến thể</strong>{" "}
                  để <strong>xem</strong> tồn theo màu &amp; size (nhân viên chỉ
                  xem; nhập kho do quản trị viên).
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
                <td>{Number(product.price).toLocaleString("vi-VN")}đ</td>
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
                    <span className="btn-variant__count">
                      {product.variants?.length ?? 0}
                    </span>
                  </button>
                </td>
                <td>
                  <button
                    className="btn-edit"
                    onClick={() => handleEditProduct(product)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Product Modal ── */}
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
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Giá</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Danh mục</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category_id: Number(e.target.value),
                      })
                    }
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
                  <label>Khuyến mãi</label>
                  <select
                    value={formData.promotion_id ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        promotion_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">Không có khuyến mãi</option>
                    {promotionsList
                      .filter(
                        (p) => p.is_active || p.id === formData.promotion_id,
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (-{p.discount_percent}%)
                          {!p.is_active ? " [Hết hạn]" : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Hình ảnh sản phẩm */}
                <div className="form-group">
                  <label>Hình ảnh sản phẩm</label>

                  {/* Danh sách ảnh hiện có với nút xóa từng ảnh */}
                  {editingProduct &&
                    (() => {
                      const existingImages = (
                        editingProduct.images ?? []
                      ).filter(
                        (img) =>
                          img.image &&
                          !formData.delete_image_ids?.includes(img.id),
                      );
                      return existingImages.length > 0 ? (
                        <div style={{ marginBottom: 10 }}>
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginBottom: 6,
                            }}
                          >
                            Ảnh hiện có — bấm ✕ để đánh dấu xóa khi lưu:
                          </p>
                          <div className="image-preview-list">
                            {existingImages.map((img) => (
                              <div
                                key={img.id}
                                className="image-preview-item"
                                style={{ position: "relative" }}
                              >
                                <img src={img.image!} alt="" />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      delete_image_ids: [
                                        ...(prev.delete_image_ids ?? []),
                                        img.id,
                                      ],
                                    }))
                                  }
                                  style={{
                                    position: "absolute",
                                    top: 2,
                                    right: 2,
                                    background: "rgba(239,68,68,0.85)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 20,
                                    height: 20,
                                    fontSize: 12,
                                    lineHeight: "20px",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    padding: 0,
                                  }}
                                  title="Xóa ảnh này"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                  {/* Ảnh mới sẽ thêm */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                  {formData.upload_images &&
                    formData.upload_images.length > 0 && (
                      <div
                        className="image-preview-list"
                        style={{ marginTop: 8 }}
                      >
                        {formData.upload_images.map((file, index) => (
                          <div
                            key={index}
                            className="image-preview-item"
                            style={{ position: "relative" }}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  upload_images: (
                                    prev.upload_images ?? []
                                  ).filter((_, i) => i !== index),
                                }))
                              }
                              style={{
                                position: "absolute",
                                top: 2,
                                right: 2,
                                background: "rgba(239,68,68,0.85)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
                                fontSize: 12,
                                lineHeight: "20px",
                                textAlign: "center",
                                cursor: "pointer",
                                padding: 0,
                              }}
                              title="Bỏ ảnh này"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* ── Bảng kích thước ── */}
                <div className="form-group">
                  <label>📏 Bảng kích thước (ảnh số đo)</label>

                  {/* Ảnh size chart hiện tại */}
                  {editingProduct?.size_chart &&
                    !formData.clear_size_chart &&
                    !formData.size_chart && (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={editingProduct.size_chart}
                          alt="Bảng size hiện tại"
                          style={{
                            maxWidth: "100%",
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid #eee",
                            display: "block",
                            objectFit: "contain",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 12,
                              color: "#888",
                              margin: 0,
                              flex: 1,
                            }}
                          >
                            Ảnh hiện tại — chọn file mới để thay thế, hoặc bấm
                            xóa.
                          </p>
                          <button
                            type="button"
                            className="btn-delete btn-sm"
                            style={{ fontSize: 12, padding: "3px 10px" }}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                clear_size_chart: true,
                              }))
                            }
                          >
                            ✕ Xóa ảnh
                          </button>
                        </div>
                      </div>
                    )}

                  {/* Đã đánh dấu xóa */}
                  {formData.clear_size_chart && !formData.size_chart && (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "8px 12px",
                        background: "#fef2f2",
                        borderRadius: 6,
                        border: "1px solid #fecaca",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#ef4444" }}>
                        Bảng kích thước sẽ bị xóa khi lưu.{" "}
                      </span>
                      <button
                        type="button"
                        style={{
                          fontSize: 12,
                          color: "#6366f1",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            clear_size_chart: false,
                          }))
                        }
                      >
                        Hoàn tác
                      </button>
                    </div>
                  )}

                  {/* Preview ảnh mới chọn */}
                  {formData.size_chart && (
                    <div style={{ marginBottom: 10 }}>
                      <img
                        src={URL.createObjectURL(formData.size_chart)}
                        alt="Preview bảng size"
                        style={{
                          maxWidth: "100%",
                          width: "100%",
                          borderRadius: 8,
                          border: "1px solid #ddd",
                          display: "block",
                          objectFit: "contain",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 12,
                            color: "#888",
                            margin: 0,
                            flex: 1,
                          }}
                        >
                          {formData.size_chart.name}
                        </p>
                        <button
                          type="button"
                          className="btn-delete btn-sm"
                          style={{ fontSize: 12, padding: "3px 10px" }}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              size_chart: null,
                            }))
                          }
                        >
                          ✕ Bỏ chọn
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSizeChartUpload}
                  />
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Ảnh này hiển thị đầy đủ chiều ngang trong trang chi tiết sản
                    phẩm.
                  </p>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowProductModal(false)}
                  >
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

        {/* ── Variant Modal ── */}
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
              <div className="variant-modal__layout">
                {/* Cột trái — ảnh + thumbnail */}
                <aside className="variant-modal__media">
                  {variantMainSrc ? (
                    <>
                      <div className="variant-modal__preview-main">
                        <img
                          src={variantMainSrc}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
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
                  <div className="variant-modal__header">
                    <div>
                      <h3 id="variant-modal-title">
                        {canManageVariantStock
                          ? "Biến thể & nhập kho"
                          : "Biến thể (chỉ xem tồn)"}
                      </h3>
                      <p className="variant-modal__product-name">
                        {selectedProduct.name}
                      </p>
                    </div>
                    <span className="variant-modal__badge" title="Số biến thể">
                      {productVariants.length} SKU
                    </span>
                  </div>

                  <div className="variant-modal__body">
                    {!canManageVariantStock && (
                      <div
                        className="admin-banner variant-modal__staff-readonly-banner"
                        role="status"
                      >
                        <strong>Nhân viên:</strong> chỉ xem tồn theo màu &amp;
                        size. Thêm/sửa/xóa biến thể và nhập kho do{" "}
                        <strong>quản trị viên</strong> thực hiện.
                      </div>
                    )}

                    {canManageVariantStock && (
                      <section
                        className="variant-modal__panel variant-modal__panel--quick"
                        aria-label="Thêm nhanh màu và size"
                      >
                        <h4 className="variant-modal__panel-title">
                          Mở rộng danh mục dùng chung
                        </h4>
                        <p className="variant-modal__hint">
                          Thêm màu hoặc size mới để chọn ở form bên dưới (áp
                          dụng cho toàn cửa hàng).
                        </p>
                        <div className="variant-quick-grid">
                          {/* Quick-add màu */}
                          <div className="variant-quick-card">
                            <div className="variant-quick-card__label">
                              <span
                                className="variant-quick-card__dot"
                                style={{ background: "#6366f1" }}
                                aria-hidden
                              />
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
                                  onChange={(e) => {
                                    setQuickAddColorName(e.target.value);
                                    setQuickAddColorError("");
                                  }}
                                  aria-label="Tên màu"
                                />
                                <label className="variant-quick-card__colorPick">
                                  <span>Mã</span>
                                  <input
                                    type="color"
                                    value={quickAddColorCode}
                                    onChange={(e) =>
                                      setQuickAddColorCode(e.target.value)
                                    }
                                    title="Chọn màu"
                                  />
                                </label>
                                {quickAddColorError && (
                                  <p
                                    style={{
                                      color: "var(--color-danger, #ef4444)",
                                      fontSize: "12px",
                                      margin: "4px 0 0",
                                    }}
                                  >
                                    {quickAddColorError}
                                  </p>
                                )}
                                <div className="variant-quick-card__actions">
                                  <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    onClick={handleQuickAddColor}
                                    disabled={quickAddColorLoading}
                                  >
                                    {quickAddColorLoading ? "Đang lưu…" : "Lưu"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() => {
                                      setShowQuickAddColor(false);
                                      setQuickAddColorError("");
                                    }}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick-add size — có thêm field order */}
                          <div className="variant-quick-card">
                            <div className="variant-quick-card__label">
                              <span
                                className="variant-quick-card__dot"
                                style={{ background: "#0ea5e9" }}
                                aria-hidden
                              />
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
                                  onChange={(e) => {
                                    setQuickAddSizeName(e.target.value);
                                    setQuickAddSizeError("");
                                  }}
                                  aria-label="Tên size"
                                />
                                {/* ✅ Field thứ tự khi thêm size mới */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginTop: 6,
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: 12,
                                      color: "var(--text-muted)",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    Thứ tự:
                                  </label>
                                  <input
                                    type="number"
                                    value={quickAddSizeOrder}
                                    min={0}
                                    onChange={(e) =>
                                      setQuickAddSizeOrder(
                                        Number(e.target.value),
                                      )
                                    }
                                    style={{ width: 70 }}
                                    aria-label="Thứ tự hiển thị"
                                  />
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    (số nhỏ = hiển thị trước)
                                  </span>
                                </div>
                                {quickAddSizeError && (
                                  <p
                                    style={{
                                      color: "var(--color-danger, #ef4444)",
                                      fontSize: "12px",
                                      margin: "4px 0 0",
                                    }}
                                  >
                                    {quickAddSizeError}
                                  </p>
                                )}
                                <div className="variant-quick-card__actions">
                                  <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    onClick={handleQuickAddSize}
                                    disabled={quickAddSizeLoading}
                                  >
                                    {quickAddSizeLoading ? "Đang lưu…" : "Lưu"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() => {
                                      setShowQuickAddSize(false);
                                      setQuickAddSizeError("");
                                    }}
                                  >
                                    Hủy
                                  </button>
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
                          {editingVariant
                            ? "Cập nhật biến thể & tồn"
                            : "Thêm biến thể mới"}
                        </h4>
                        <p className="variant-stock-workflow-hint">
                          {editingVariant
                            ? "Chọn đúng màu/size của SKU, chỉnh « Tồn kho » trực tiếp hoặc « Nhập thêm » rồi Lưu."
                            : "Chọn màu, size và tồn ban đầu; sau này mở lại đây để nhập thêm hàng."}
                        </p>
                        <form
                          onSubmit={handleSubmitVariant}
                          className="variant-form-compact"
                        >
                          <div className="variant-form-compact__grid">
                            <div className="form-group">
                              <label htmlFor="vf-color">Màu</label>
                              <select
                                ref={variantColorSelectRef}
                                id="vf-color"
                                value={variantForm.color_id || ""}
                                onChange={(e) =>
                                  setVariantForm({
                                    ...variantForm,
                                    color_id: Number(e.target.value),
                                  })
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
                                value={variantForm.size_id || ""}
                                onChange={(e) =>
                                  setVariantForm({
                                    ...variantForm,
                                    size_id: Number(e.target.value),
                                  })
                                }
                                required
                              >
                                <option value="" disabled>
                                  Chọn size
                                </option>
                                {/* ✅ Hiển thị size theo thứ tự đã sort */}
                                {sizesList.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} (thứ tự: {s.order})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group form-group--stock">
                              <label htmlFor="vf-stock">
                                {editingVariant
                                  ? "Tồn kho (sau cập nhật)"
                                  : "Tồn kho ban đầu"}
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
                                    stock: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    ),
                                  })
                                }
                                required
                              />
                              <div
                                className="variant-stock-quick"
                                role="group"
                                aria-label="Cộng nhanh vào tồn"
                              >
                                <span className="variant-stock-quick__label">
                                  Cộng nhanh:
                                </span>
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
                                <label htmlFor="vf-warehouse-delta">
                                  Nhập thêm vào kho
                                </label>
                                <div className="variant-stock-inbound__row">
                                  <input
                                    id="vf-warehouse-delta"
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="VD: 20 hoặc -3"
                                    value={warehouseDelta}
                                    onChange={(e) =>
                                      setWarehouseDelta(e.target.value)
                                    }
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
                                  Số dương = nhập thêm; số âm = trừ tồn (kiểm
                                  kê). Bấm Áp dụng để cộng vào ô tồn phía trên,
                                  rồi Lưu.
                                </p>
                              </div>
                            </div>
                            <div className="form-group">
                              <label htmlFor="vf-price">
                                Giá riêng cho size này
                              </label>
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-muted)",
                                  margin: "4px 0 8px",
                                }}
                              >
                                Để trống = dùng giá sản phẩm (
                                {Number(selectedProduct.price).toLocaleString(
                                  "vi-VN",
                                )}
                                đ). Nhập số để override giá cho size/màu này.
                              </p>
                              <input
                                id="vf-price"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                placeholder={`Mặc định: ${Number(selectedProduct.price).toLocaleString("vi-VN")}đ`}
                                value={variantForm.price ?? ""}
                                onChange={(e) =>
                                  setVariantForm({
                                    ...variantForm,
                                    price:
                                      e.target.value === ""
                                        ? null
                                        : Math.max(0, Number(e.target.value)),
                                  })
                                }
                              />
                            </div>
                            <div className="variant-form-compact__submit">
                              <button
                                type="submit"
                                className="btn-primary variant-form-compact__btn-main"
                              >
                                {editingVariant
                                  ? "Lưu thay đổi"
                                  : "Thêm biến thể"}
                              </button>
                              {editingVariant && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => {
                                    setEditingVariant(null);
                                    setWarehouseDelta("");
                                    setVariantForm({
                                      color_id: 0,
                                      size_id: 0,
                                      stock: 0,
                                      price: null,
                                    });
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

                    <section
                      className="variant-modal__panel"
                      aria-label="Danh sách biến thể"
                    >
                      <div className="variant-modal__list-head">
                        <h4 className="variant-modal__panel-title variant-modal__panel-title--inline">
                          {canManageVariantStock
                            ? "Danh sách"
                            : "Danh sách (màu · size · tồn)"}
                        </h4>
                        <p className="variant-modal__legend">
                          Ô tồn:{" "}
                          <span className="variant-legend-tag variant-legend-tag--ok">
                            đủ
                          </span>
                          <span className="variant-legend-tag variant-legend-tag--low">
                            thấp ≤5
                          </span>
                          <span className="variant-legend-tag variant-legend-tag--empty">
                            hết
                          </span>
                        </p>
                      </div>
                      <div className="variant-table-wrap">
                        <table className="data-table variant-table">
                          <thead>
                            <tr>
                              <th>Màu</th>
                              <th>Size</th>
                              <th>Giá riêng</th>
                              <th>Tồn</th>
                              {canManageVariantStock && (
                                <th className="variant-table__actions">
                                  Thao tác
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {productVariants.length === 0 ? (
                              <tr>
                                <td colSpan={canManageVariantStock ? 5 : 4}>
                                  <div className="variant-empty">
                                    <p className="variant-empty__title">
                                      Chưa có biến thể
                                    </p>
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
                                        style={{
                                          backgroundColor: v.color.code,
                                        }}
                                        title={v.color.name}
                                      />
                                      <span>{v.color.name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="variant-size-pill">
                                      {v.size.name}
                                    </span>
                                  </td>
                                  <td>
                                    {v.price != null ? (
                                      Number(v.price).toLocaleString("vi-VN") +
                                      "đ"
                                    ) : (
                                      <span
                                        style={{
                                          color: "var(--text-muted, #9ca3af)",
                                          fontSize: "12px",
                                        }}
                                      >
                                        = giá SP
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <span
                                      className={`variant-stock variant-stock--${variantStockTone(v.stock)}`}
                                    >
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
                                        onClick={() =>
                                          handleDeleteVariant(v.id)
                                        }
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
                  </div>
                </div>
              </div>

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
