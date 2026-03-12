import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products, cart, promotions } from '../api/client';
import './ProductDetail.css';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  old_price: string | null;
  stock: number;
  image: string;
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
      try {
        const productId = Number(id);
        
        const [productRes, relatedRes, promotionsRes] = await Promise.all([
          products.get(productId),
          products.related(productId),
          promotions.active(),
        ]);

        setProduct(productRes.data);
        setRelatedProducts(relatedRes.data);
        setActivePromotions(promotionsRes.data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await cart.addItem(product.id, quantity);
      alert('Added to cart!');
    } catch {
      alert('Please login to add to cart');
    }
  };

  const calculateDiscountedPrice = (price: string, discountPercent: number) => {
    const priceNum = parseFloat(price);
    return (priceNum - (priceNum * discountPercent) / 100).toFixed(2);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!product) return <div className="error">Product not found</div>;

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  return (
    <div className="product-detail">
      {/* Active Promotions Banner */}
      {activePromotions.length > 0 && (
        <div className="promotions-banner">
          <h3>🎉 Active Promotions</h3>
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
            <img src={product.image} alt={product.name} />
            {product.promotion && (
              <span className="discount-badge">
                -{product.promotion.discount_percent}%
              </span>
            )}
          </div>
        </div>

        <div className="product-info-section">
          <nav className="breadcrumb">
            <Link to="/">Home</Link> / <Link to="/">{product.category.name}</Link> / {product.name}
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
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</button>
              </div>
              <span className="stock-info">{product.stock} in stock</span>
            </div>
          </div>

          <div className="product-actions">
            <button 
              className="add-to-cart-btn" 
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button className="wishlist-btn">♡ Add to Wishlist</button>
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
          <h2>Related Products</h2>
          <div className="related-products-grid">
            {relatedProducts.map((related) => (
              <Link to={`/product/${related.id}`} key={related.id} className="related-product-card">
                <img src={related.image} alt={related.name} />
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
