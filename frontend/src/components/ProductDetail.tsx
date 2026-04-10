import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { products, cart, reviews as reviewsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../hooks/useWishlist";
import { notifyCartUpdated } from "../utils/cartEvents";
import "../styles/components/ProductDetail.css";
import type { ProductVariant, Review } from "../types";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x500?text=San+pham";

const FEEDBACK_TYPES = [
  { value: "quality", label: "Chất lượng sản phẩm" },
  { value: "price", label: "Giá cả" },
  { value: "shipping", label: "Vấn đề giao hàng" },
  { value: "size", label: "Kích thước/Size" },
  { value: "service", label: "Chăm sóc khách hàng" },
  { value: "other", label: "Khác" },
];

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  old_price?: string | null;
  stock?: number;
  image?: string;
  images?: { id: number; image: string }[];
  category: { id: number; name: string };
  promotion: { id: number; name: string; discount_percent: number } | null;
  variants?: ProductVariant[];
}

type NotifType = "success" | "error" | "info" | "warning";
interface Notification {
  id: number;
  type: NotifType;
  message: string;
}

let _notifId = 0;

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toggle: toggleWishlist, has: isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    feedback_type: "quality",
    content: "",
  });
  const [reviewSelectedVariantId, setReviewSelectedVariantId] = useState<
    number | ""
  >("");
  const [purchasableVariants, setPurchasableVariants] = useState<
    { variant_id: number }[]
  >([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const thumbListRef = useRef<HTMLDivElement>(null);
  const variants = product?.variants ?? [];

  const findVariantForColor = (colorName: string, preferredSize?: string) =>
    variants.find(
      (v) => v.color.name === colorName && v.size.name === preferredSize,
    ) ||
    variants.find((v) => v.color.name === colorName && (v.stock ?? 0) > 0) ||
    variants.find((v) => v.color.name === colorName) ||
    null;

  const findVariantForSize = (sizeName: string, preferredColor?: string) =>
    variants.find(
      (v) => v.size.name === sizeName && v.color.name === preferredColor,
    ) ||
    variants.find((v) => v.size.name === sizeName && (v.stock ?? 0) > 0) ||
    variants.find((v) => v.size.name === sizeName) ||
    null;

  const notify = (
    message: string,
    type: NotifType = "info",
    duration = 4000,
  ) => {
    const notif: Notification = { id: ++_notifId, type, message };
    setNotifications((prev) => [...prev, notif]);
    if (duration > 0) {
      setTimeout(() => removeNotif(notif.id), duration);
    }
  };

  const removeNotif = (notifId: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

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
          setLoading(false);
          return;
        }
        const [relatedRes, reviewsRes] = await Promise.all([
          products.related(productId),
          reviewsApi.getByProduct(productId),
        ]);
        setRelatedProducts((relatedRes?.data ?? []) as Product[]);
        setReviewsList((reviewsRes?.data ?? []) as Review[]);
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
        setRelatedProducts([]);
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
      setSelectedColor("");
      setSelectedSize("");
      return;
    }
    const firstVariant =
      variants.find((v) => (v.stock ?? 0) > 0) || variants[0];
    setSelectedColor(firstVariant?.color.name || "");
    setSelectedSize(firstVariant?.size.name || "");
  }, [product, variants]);

  useEffect(() => {
    if (!variants.length) return;
    const selectedVariantExists = variants.some(
      (v) => v.size.name === selectedSize && v.color.name === selectedColor,
    );
    if (selectedVariantExists) return;

    const fallbackVariant =
      findVariantForColor(selectedColor, selectedSize) ||
      findVariantForSize(selectedSize, selectedColor) ||
      variants.find((v) => (v.stock ?? 0) > 0) ||
      variants[0];

    if (!fallbackVariant) return;
    setSelectedColor(fallbackVariant.color.name);
    setSelectedSize(fallbackVariant.size.name);
  }, [selectedColor, selectedSize, variants]);

  useEffect(() => {
    if (!product) return;
    const firstImg =
      product.images?.[0]?.image || product.image || PLACEHOLDER_IMAGE;
    setSelectedImage(firstImg);
  }, [product]);

  /** Khi đổi màu/size, không để số lượng vượt tồn kho variant */
  useEffect(() => {
    if (!product) return;
    const v = variants.find(
      (x) => x.size.name === selectedSize && x.color.name === selectedColor,
    );
    const max = variants.length > 0 ? (v?.stock ?? 0) : (product.stock ?? 0);
    if (max > 0) {
      setQuantity((q) => Math.min(q, max));
    }
  }, [product, selectedSize, selectedColor, variants]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      notify("Vui lòng đăng nhập để thêm vào giỏ hàng", "warning");
      return;
    }
    if (user.can_access_admin) {
      notify("Tài khoản quản trị không thể thêm vào giỏ hàng.", "warning");
      return;
    }
    const selectedVariant = variants.find(
      (v) => v.size.name === selectedSize && v.color.name === selectedColor,
    );
    if (variants.length && !selectedVariant) {
      notify("Vui lòng chọn size và màu sắc.", "warning");
      return;
    }
    try {
      await cart.addItem({
        quantity,
        ...(selectedVariant
          ? { product_variant_id: selectedVariant.id }
          : { product_id: product.id }),
      });
      notifyCartUpdated();
      notify("Đã thêm vào giỏ hàng!", "success");
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          status?: number;
          data?: { quantity?: string[]; detail?: string };
        };
      };
      const status = ax.response?.status;
      const data = ax.response?.data;
      const q = data?.quantity;
      const apiMsg = Array.isArray(q) ? q[0] : data?.detail;
      if (status === 401)
        notify("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.", "error");
      else if (typeof apiMsg === "string") notify(apiMsg, "error");
      else notify("Không thể thêm vào giỏ hàng. Vui lòng thử lại.", "error");
    }
  };

  const calculateDiscountedPrice = (price: string, discountPercent: number) => {
    const priceNum = parseFloat(price);
    return (priceNum - (priceNum * discountPercent) / 100).toFixed(2);
  };

  const handleOpenReview = async () => {
    if (!user) {
      notify("Vui lòng đăng nhập để đánh giá sản phẩm", "warning");
      return;
    }
    if (user.can_access_admin) {
      notify("Tài khoản quản trị không thể đánh giá sản phẩm.", "warning");
      return;
    }

    try {
      const res = await reviewsApi.getPurchasable();
      const purchasable = (res?.data ?? []) as { variant_id: number }[];
      setPurchasableVariants(purchasable);

      const productVariantIds = new Set(
        product?.variants?.map((v) => v.id) ?? [],
      );
      const eligible = purchasable.filter((p) =>
        productVariantIds.has(p.variant_id),
      );

      if (eligible.length === 0) {
        notify(
          "Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng thành công.",
          "warning",
        );
        return;
      }

      setReviewSelectedVariantId(eligible[0].variant_id);
      setShowReviewModal(true);
      setReviewForm({ rating: 5, feedback_type: "quality", content: "" });
    } catch {
      notify("Không thể tải thông tin. Vui lòng thử lại.", "error");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.can_access_admin) {
      notify("Tài khoản quản trị không thể đánh giá sản phẩm.", "warning");
      return;
    }
    if (!reviewSelectedVariantId) {
      notify("Vui lòng chọn phân loại sản phẩm muốn đánh giá.", "warning");
      return;
    }
    try {
      await reviewsApi.create({
        product: reviewSelectedVariantId,
        rating: reviewForm.rating,
        feedback_type: reviewForm.feedback_type,
        content: reviewForm.content,
      });
      notify("Cảm ơn bạn đã đánh giá!", "success");
      setShowReviewModal(false);
      const reviewsRes = await reviewsApi.getByProduct(Number(id));
      setReviewsList((reviewsRes?.data ?? []) as Review[]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể gửi đánh giá.";
      notify(msg, "error");
    }
  };

  const scrollThumbs = (dir: "left" | "right") => {
    if (!thumbListRef.current) return;
    thumbListRef.current.scrollBy({
      left: dir === "right" ? 200 : -200,
      behavior: "smooth",
    });
  };

  const averageRating =
    reviewsList.length > 0
      ? (
          reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
        ).toFixed(1)
      : 0;

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!product) {
    return (
      <div className="product-detail product-detail--not-found">
        <p className="error">Không tìm thấy sản phẩm.</p>
        <Link to="/products" className="back-link">
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const sizes = variants.length
    ? [...new Set(variants.map((v) => v.size.name))]
    : ["M"];
  const colors = variants.length
    ? [...new Set(variants.map((v) => v.color.name))]
    : [];

  const allImages: { id: number | string; image: string }[] =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [{ id: "main", image: product.image }]
        : [{ id: "placeholder", image: PLACEHOLDER_IMAGE }];

  const hasThumbnails = allImages.length > 1;

  const selectedVariant = variants.find(
    (v) => v.size.name === selectedSize && v.color.name === selectedColor,
  );
  const variantStock =
    variants.length > 0 ? (selectedVariant?.stock ?? 0) : (product.stock ?? 0);

  const productVariantIds = new Set(product.variants?.map((v) => v.id) ?? []);
  const eligiblePurchasableVariants = purchasableVariants.filter((p) =>
    productVariantIds.has(p.variant_id),
  );
  const reviewVariantOptions =
    product.variants?.filter((v) =>
      eligiblePurchasableVariants.some((p) => p.variant_id === v.id),
    ) ?? [];

  const showLoginNotice = !user;

  return (
    <div className="product-detail">
      {notifications.length > 0 && (
        <div className="notification-stack">
          {notifications.map((n) => (
            <div key={n.id} className={`notification notification--${n.type}`}>
              <span className="notification__icon">
                {n.type === "success" && "✓"}
                {n.type === "error" && "✕"}
                {n.type === "warning" && "!"}
                {n.type === "info" && "i"}
              </span>
              <span className="notification__message">{n.message}</span>
              <button
                type="button"
                className="notification__close"
                onClick={() => removeNotif(n.id)}
                aria-label="Đóng thông báo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="product-main">
        <div className="product-gallery">
          <div className="product-image-main">
            <img
              src={selectedImage || allImages[0]?.image || PLACEHOLDER_IMAGE}
              alt={product.name}
            />
            {product.promotion && (
              <span className="discount-badge">
                -{product.promotion.discount_percent}%
              </span>
            )}
            {!user?.can_access_admin && (
              <button
                type="button"
                className={`image-wishlist-btn${isInWishlist(product.id) ? " active" : ""}`}
                title={
                  isInWishlist(product.id)
                    ? "Bỏ yêu thích"
                    : "Thêm vào yêu thích"
                }
                aria-label={
                  isInWishlist(product.id)
                    ? "Bỏ yêu thích"
                    : "Thêm vào yêu thích"
                }
                onClick={() => {
                  if (!user) {
                    notify("Vui lòng đăng nhập để dùng yêu thích.", "warning");
                    return;
                  }
                  void toggleWishlist(product.id);
                }}
              >
                {isInWishlist(product.id) ? "♥" : "♡"}
              </button>
            )}
          </div>

          {hasThumbnails && (
            <div className="thumb-row-wrapper">
              <button
                className="thumb-arrow thumb-arrow--left"
                type="button"
                onClick={() => scrollThumbs("left")}
                aria-label="Ảnh trước"
              >
                &#8249;
              </button>
              <div className="thumb-list" ref={thumbListRef}>
                {allImages.map((img) => (
                  <div
                    key={img.id}
                    className={`thumb-item${selectedImage === img.image ? " active" : ""}`}
                    onClick={() => setSelectedImage(img.image)}
                    role="button"
                    aria-label="Xem ảnh"
                  >
                    <img src={img.image} alt={product.name} />
                  </div>
                ))}
              </div>
              <button
                className="thumb-arrow thumb-arrow--right"
                type="button"
                onClick={() => scrollThumbs("right")}
                aria-label="Ảnh tiếp"
              >
                &#8250;
              </button>
            </div>
          )}
        </div>

        <div className="product-info-section">
          <nav className="breadcrumb" aria-label="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/products">{product.category.name}</Link>
            <span className="sep">/</span>
            <span>{product.name}</span>
          </nav>

          <h1>{product.name}</h1>

          <div className="product-rating">
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= Number(averageRating) ? "filled" : ""}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="rating-count">
              {reviewsList.length > 0
                ? `${averageRating} (${reviewsList.length} đánh giá)`
                : "Chưa có đánh giá"}
            </span>
          </div>

          <div className="product-price">
            {product.promotion ? (
              <>
                <span className="current-price">
                  {Number(
                    calculateDiscountedPrice(
                      product.price,
                      product.promotion.discount_percent,
                    ),
                  ).toLocaleString("vi-VN")}
                  đ
                </span>
                <span className="original-price">
                  {Number(product.price).toLocaleString("vi-VN")}đ
                </span>
                <span className="discount-tag">
                  -{product.promotion.discount_percent}%
                </span>
              </>
            ) : (
              <span className="current-price">
                {Number(product.price).toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
          <div className="product-options">
            {colors.length > 0 && (
              <div className="option-group color-selection">
                <label>
                  Màu sắc:{" "}
                  <span className="color-name-label">{selectedColor}</span>
                </label>
                <div className="color-buttons">
                  {colors.map((color) => {
                    const variant = variants.find(
                      (v) => v.color.name === color,
                    );
                    const code = variant?.color.code || "#888";
                    const isWhite = ["#ffffff", "#fff", "white"].includes(
                      code.toLowerCase(),
                    );
                    const hasStock = variants.some(
                      (v) => v.color.name === color && (v.stock ?? 0) > 0,
                    );
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`color-btn${selectedColor === color ? " selected" : ""}${isWhite ? " white" : ""}${!hasStock ? " out-of-stock" : ""}`}
                        onClick={() => {
                          const nextVariant = findVariantForColor(
                            color,
                            selectedSize,
                          );
                          if (!nextVariant) return;
                          setSelectedColor(nextVariant.color.name);
                          setSelectedSize(nextVariant.size.name);
                        }}
                        style={{ backgroundColor: code }}
                        title={`${color}${!hasStock ? " (Hết hàng)" : ""}`}
                        aria-label={color}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="option-group size-selection">
              <label>Kích thước:</label>
              <div className="size-buttons">
                {sizes.map((size) => {
                  const variantForSize = variants.find(
                    (v) =>
                      v.size.name === size && v.color.name === selectedColor,
                  );
                  const sizeHasStock = variantForSize
                    ? (variantForSize.stock ?? 0) > 0
                    : variants.some(
                        (v) => v.size.name === size && (v.stock ?? 0) > 0,
                      );
                  return (
                    <button
                      key={size}
                      type="button"
                      className={`size-btn${selectedSize === size ? " selected" : ""}${!sizeHasStock ? " out-of-stock" : ""}`}
                      onClick={() => {
                        const nextVariant = findVariantForSize(
                          size,
                          selectedColor,
                        );
                        if (!nextVariant) return;
                        setSelectedColor(nextVariant.color.name);
                        setSelectedSize(nextVariant.size.name);
                      }}
                      title={!sizeHasStock ? `${size} (Hết hàng)` : size}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="option-group quantity-selection">
              <label>Số lượng:</label>
              <div className="qty-row">
                <div className="quantity-controls">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(Math.min(variantStock, quantity + 1))
                    }
                    disabled={variantStock === 0}
                  >
                    +
                  </button>
                </div>
                <span
                  className={`stock-info${variantStock === 0 ? " out" : variantStock <= 5 ? " low" : ""}`}
                >
                  {variantStock === 0
                    ? "Hết hàng"
                    : variantStock <= 5
                      ? `Chỉ còn ${variantStock} sản phẩm`
                      : `${variantStock} sản phẩm có sẵn`}
                </span>
              </div>
            </div>
          </div>

          <div className="product-actions">
            {!user?.can_access_admin && (
              <>
                <button
                  className="add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={variantStock === 0}
                  type="button"
                >
                  {variantStock === 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
                </button>
                <button
                  type="button"
                  className={`wishlist-btn${isInWishlist(product.id) ? " active" : ""}`}
                  onClick={() => {
                    if (!user) {
                      notify(
                        "Vui lòng đăng nhập để dùng yêu thích.",
                        "warning",
                      );
                      return;
                    }
                    void toggleWishlist(product.id);
                  }}
                >
                  {isInWishlist(product.id) ? "♥" : "♡"} Yêu thích
                </button>
              </>
            )}
          </div>

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
          <div className="product-description">
            <p className="product-description__title">Chi tiết sản phẩm:</p>
            {product.description
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0).length > 1 ? (
              <ul className="product-description__list">
                {product.description
                  .split("\n")
                  .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                  .filter((line) => line.length > 0)
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ul>
            ) : (
              <p>{product.description}</p>
            )}
          </div>
        </div>
      </div>
      <section className="product-reviews">
        <div className="reviews-header">
          <h2>Đánh giá sản phẩm ({reviewsList.length})</h2>
        </div>

        {reviewsList.length > 0 && (
          <div className="reviews-summary">
            <span className="avg-score">{averageRating}</span>
            <div>
              <div className="avg-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={
                      s <= Math.round(Number(averageRating)) ? "filled" : ""
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className="avg-count">{reviewsList.length} đánh giá</div>
            </div>
          </div>
        )}

        {reviewsList.length > 0 ? (
          <div className="reviews-list">
            {reviewsList.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-user">
                    <span className="user-avatar">
                      {review.user.username.charAt(0).toUpperCase()}
                    </span>
                    <span className="user-name">{review.user.username}</span>
                  </div>
                  <div className="review-meta">
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString("vi-VN")}
                    </span>
                    <span className="feedback-type-badge">
                      {
                        FEEDBACK_TYPES.find(
                          (t) => t.value === review.feedback_type,
                        )?.label
                      }
                    </span>
                  </div>
                </div>
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={s <= review.rating ? "filled" : ""}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {review.content && (
                  <p className="review-text">{review.content}</p>
                )}
                {review.variant_info && (
                  <p className="review-variant">
                    Phân loại: {review.variant_info.color.name} /{" "}
                    {review.variant_info.size.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-reviews">
            Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!
          </p>
        )}

        <div className="review-action-area">
          {user && !user.can_access_admin && (
            <button
              className="btn-review-product"
              type="button"
              onClick={handleOpenReview}
            >
              Viết đánh giá
            </button>
          )}
          {showLoginNotice && (
            <div className="review-notice">
              <strong>Đăng nhập để đánh giá sản phẩm</strong>
              <p>
                Chỉ khách hàng đã mua và nhận hàng thành công mới có thể gửi
                đánh giá.
              </p>
            </div>
          )}
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="related-products">
          <h2>Sản phẩm liên quan</h2>
          <div className="related-products-grid">
            {relatedProducts.map((related) => (
              <Link
                to={`/product/${related.id}`}
                key={related.id}
                className="related-product-card"
              >
                <div className="related-product-image">
                  <img
                    src={related.image || PLACEHOLDER_IMAGE}
                    alt={related.name}
                  />
                  {related.promotion && (
                    <span className="related-discount">
                      -{related.promotion.discount_percent}%
                    </span>
                  )}
                </div>
                <div className="related-product-info">
                  <h4>{related.name}</h4>
                  <p className="price">
                    {related.promotion
                      ? `${Number(calculateDiscountedPrice(related.price, related.promotion.discount_percent)).toLocaleString("vi-VN")}đ`
                      : `${Number(related.price).toLocaleString("vi-VN")}đ`}
                    {related.old_price && (
                      <span className="old-price">
                        {Number(related.old_price).toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showReviewModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReviewModal(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Viết đánh giá sản phẩm</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowReviewModal(false)}
                aria-label="Đóng"
              >
                &#215;
              </button>
            </div>

            <div className="modal-product-info">
              <strong>{product?.name}</strong>
            </div>

            <form onSubmit={handleSubmitReview}>
              {reviewVariantOptions.length > 1 && (
                <div className="form-group">
                  <label>Phân loại đã mua</label>
                  <select
                    value={reviewSelectedVariantId}
                    onChange={(e) =>
                      setReviewSelectedVariantId(Number(e.target.value))
                    }
                  >
                    {reviewVariantOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.color.name} / {v.size.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reviewVariantOptions.length === 1 && (
                <div className="modal-variant-single">
                  <span className="modal-variant-label">Phân loại:</span>
                  <span
                    className="variant-color-dot"
                    style={{
                      backgroundColor:
                        reviewVariantOptions[0].color.code || "#888",
                    }}
                  />
                  <span>
                    {reviewVariantOptions[0].color.name} /{" "}
                    {reviewVariantOptions[0].size.name}
                  </span>
                </div>
              )}

              <div className="form-group">
                <label>Đánh giá của bạn</label>
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={s <= reviewForm.rating ? "selected" : ""}
                      onClick={() =>
                        setReviewForm({ ...reviewForm, rating: s })
                      }
                      role="button"
                      aria-label={`${s} sao`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Loại phản hồi</label>
                <select
                  value={reviewForm.feedback_type}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      feedback_type: e.target.value,
                    })
                  }
                >
                  {FEEDBACK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Nội dung <span className="label-optional">(tuỳ chọn)</span>
                </label>
                <textarea
                  value={reviewForm.content}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, content: e.target.value })
                  }
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowReviewModal(false)}
                >
                  Huỷ
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
