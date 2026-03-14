import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products, cart, promotions } from '../api/client';
import '../styles/components/ProductDetail.css';

/** Ảnh placeholder khi API không trả về image */
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x500?text=San+pham';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  old_price?: string | null;
  stock?: number;
  image?: string;
  category: { id: number; name: string };
  promotion: { id: number; name: string; discount_percent: number } | null;
}

interface Promotion {
  id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');

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
          setRelatedProducts([]);
          setActivePromotions([]);
          setLoading(false);
          return;
        }
        const [relatedRes, promotionsRes] = await Promise.all([
          products.related(productId),
          promotions.active(),
        ]);
        setRelatedProducts((relatedRes?.data ?? []) as Product[]);
        setActivePromotions((promotionsRes?.data ?? []) as Promotion[]);
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
        setRelatedProducts([]);
        setActivePromotions([]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await cart.addItem(product.id, quantity);
      alert('Đã thêm vào giỏ hàng!');
    } catch {
      alert('Vui lòng đăng nhập để thêm vào giỏ hàng');
    }
  };

  const calculateDiscountedPrice = (price: string, discountPercent: number) => {
    const priceNum = parseFloat(price);
    return (priceNum - (priceNum * discountPercent) / 100).toFixed(2);
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!product) {
    return (
      <div className="product-detail product-detail--not-found">
        <p className="error">Không tìm thấy sản phẩm.</p>
        <Link to="/products" className="back-link">← Quay lại danh sách sản phẩm</Link>
      </div>
    );
  }

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const productImage = product.image || PLACEHOLDER_IMAGE;
  const stock = product.stock ?? 99;

  return (
    <div className="product-detail">
      {/* Active Promotions Banner */}
      {activePromotions.length > 0 && (
        <div className="promotions-banner">
          <h3>🎉 Khuyến mãi đang diễn ra</h3>
          <div className="promotions-list">
            {activePromotions.map((promo) => (
              <span key={promo.id} className="promo-tag">
                {promo.name}: {promo.discount_percent}% OFF
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="product-main">
        <div className="product-image-section">
          <div className="product-image">
            <img src={productImage} alt={product.name} />
            {product.promotion && (
              <span className="discount-badge">
                -{product.promotion.discount_percent}%
              </span>
            )}
          </div>
        </div>

        <div className="product-info-section">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link> / <Link to="/products">{product.category.name}</Link> / {product.name}
          </nav>

          <h1>{product.name}</h1>

          <div className="product-price">
            {product.promotion ? (
              <>
                <span className="current-price">
                  ${calculateDiscountedPrice(product.price, product.promotion.discount_percent)}
                </span>
                <span className="original-price">${product.price}</span>
                <span className="discount-tag">-{product.promotion.discount_percent}%</span>
              </>
            ) : (
              <span className="current-price">${product.price}</span>
            )}
          </div>

          <div className="product-description">
            <p>{product.description}</p>
          </div>

          <div className="product-options">
            <div className="size-selection">
              <label>Size:</label>
              <div className="size-buttons">
                {sizes.map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="quantity-selection">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(stock, quantity + 1))}>+</button>
              </div>
              <span className="stock-info">{stock} có sẵn</span>
            </div>
          </div>

          <div className="product-actions">
            <button 
              className="add-to-cart-btn" 
              onClick={handleAddToCart}
              disabled={stock === 0}
            >
              {stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
            <button className="wishlist-btn">♡ Thêm vào yêu thích</button>
          </div>

          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <Link to={`/?category=${product.category.id}`}>{product.category.name}</Link>
            </div>
            {product.promotion && (
              <div className="meta-item">
                <span className="meta-label">Promotion:</span>
                <span>{product.promotion.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <h2>Sản phẩm liên quan</h2>
          <div className="related-products-grid">
            {relatedProducts.map((related) => (
              <Link to={`/product/${related.id}`} key={related.id} className="related-product-card">
                <img src={related.image || PLACEHOLDER_IMAGE} alt={related.name} />
                <h4>{related.name}</h4>
                <p className="price">
                  ${related.price}
                  {related.old_price && <span className="old-price">${related.old_price}</span>}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetail;
