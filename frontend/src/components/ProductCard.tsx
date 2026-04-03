import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { cart } from '../api/client';
import { useWishlist } from '../hooks/useWishlist';
import '../styles/components/ProductCard.css';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x400?text=San+pham';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { ids, toggle: toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const isWishlisted = ids.includes(product.id);

  const productImage = product.image || PLACEHOLDER_IMAGE;
  const productStock = product.stock ?? 99;

  const discountedPrice = (price: string, pct: number) =>
    (parseFloat(price) * (1 - pct / 100)).toFixed(0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    setIsAdding(true);
    try {
      await cart.addItem({ product_id: product.id, quantity: 1 });
      alert('Đã thêm vào giỏ hàng!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) alert('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      else alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const outOfStock = productStock === 0;

  return (
    <Link to={`/product/${product.id}`} className="productCard">
      {/* ── Image ── */}
      <div className="productCardImageWrapper">
        <img
          src={productImage}
          alt={product.name}
          className="productCardImage"
          loading="lazy"
        />

        {product.promotion && (
          <span className="productCardDiscount">
            -{product.promotion.discount_percent}%
          </span>
        )}

        {/* Quick actions */}
        <div className="productCardActions">
          <button
            className={`productCardActionBtn${isWishlisted ? ' wishlisted' : ''}`}
            onClick={handleWishlist}
            aria-label={isWishlisted ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
          >
            {isWishlisted ? '♥' : '♡'}
          </button>
          <Link
            to={`/product/${product.id}`}
            className="productCardActionBtn"
            onClick={(e) => e.stopPropagation()}
            aria-label="Xem chi tiết"
          >
            👁
          </Link>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="productCardContent">
        <p className="productCardCategory">{product.category.name}</p>
        <h3 className="productCardName">{product.name}</h3>

        <div className="productCardPrice">
          {product.promotion ? (
            <>
              <span className="productCardCurrentPrice">
                {discountedPrice(product.price, product.promotion.discount_percent)}đ
              </span>
              <span className="productCardOldPrice">{product.price}đ</span>
            </>
          ) : (
            <span className="productCardCurrentPrice">{product.price}đ</span>
          )}
        </div>

        <button
          className={`productCardAddBtn${isAdding ? ' adding' : ''}`}
          onClick={handleAddToCart}
          disabled={outOfStock || isAdding}
        >
          {outOfStock ? 'Hết hàng' : isAdding ? 'Đang thêm…' : 'Thêm vào giỏ'}
        </button>
      </div>
    </Link>
  );
}