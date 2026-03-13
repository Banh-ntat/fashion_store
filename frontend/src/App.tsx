import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { products, categories, cart, auth, promotions } from './api/client';
import About from './pages/About';
import Policy from './pages/Policy';
import Layout from './components/Layout';
import ProductDetail from './components/ProductDetail';
import './styles/index.css';
import './App.css';

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

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Promotion {
  id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
}

function Home() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      products.list(),
      categories.list(),
      promotions.active(),
      products.hotDeals(),
      products.newArrivals(),
    ])
      .then(([pRes, cRes, promoRes, hotDealsRes, newArrivalsRes]) => {
        setProductsList(pRes.data.results || pRes.data);
        setCats(cRes.data.results || cRes.data);
        setActivePromotions(promoRes.data);
        setHotDeals(hotDealsRes.data);
        setNewArrivals(newArrivalsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = selectedCat
    ? productsList.filter((p) => p.category.id === selectedCat)
    : productsList;

  const handleAddToCart = async (productId: number) => {
    try {
      await cart.addItem(productId, 1);
      alert('Added to cart!');
    } catch {
      alert('Please login to add to cart');
    }
  };

  const calculateDiscountedPrice = (price: string, discountPercent: number) => {
    const priceNum = parseFloat(price);
    return (priceNum - (priceNum * discountPercent) / 100).toFixed(2);
  };

  const renderProductCard = (p: Product) => (
    <Link to={`/product/${p.id}`} key={p.id} className="product-card">
      <div className="product-image-wrapper">
        <img src={p.image} alt={p.name} />
        {p.promotion && (
          <span className="product-discount-badge">-{p.promotion.discount_percent}%</span>
        )}
      </div>
      <h4>{p.name}</h4>
      <p className="category-name">{p.category.name}</p>
      <p className="price">
        {p.promotion ? (
          <>
            <span className="current-price">${calculateDiscountedPrice(p.price, p.promotion.discount_percent)}</span>
            <span className="old-price">${p.price}</span>
          </>
        ) : (
          <span className="current-price">${p.price}</span>
        )}
      </p>
      <button 
        className="add-to-cart-btn"
        onClick={(e) => {
          e.preventDefault();
          handleAddToCart(p.id);
        }}
      >
        Thêm vào giỏ
      </button>
    </Link>
  );

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="home">
      {/* Promotions Banner */}
      {activePromotions.length > 0 && (
        <div className="home-promotions-banner">
          <div className="promo-content">
            <span className="promo-icon">🎉</span>
            <h3>Hot Deals! {activePromotions[0].discount_percent}% OFF</h3>
            <p>Shop now and save big on selected items!</p>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <h3>Danh mục</h3>
        <ul>
          <li>
            <button
              className={selectedCat === null ? 'active' : ''}
              onClick={() => setSelectedCat(null)}
            >
              Tất cả
            </button>
          </li>
          {cats.map((c) => (
            <li key={c.id}>
              <button
                className={selectedCat === c.id ? 'active' : ''}
                onClick={() => setSelectedCat(c.id)}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="products">
        {/* Hot Deals Section */}
        {hotDeals.length > 0 && !selectedCat && (
          <section className="products-section">
            <h2>🔥 Hot Deals</h2>
            <div className="product-grid">
              {hotDeals.map(renderProductCard)}
            </div>
          </section>
        )}

        {/* New Arrivals Section */}
        {newArrivals.length > 0 && !selectedCat && (
          <section className="products-section">
            <h2>🆕 New Arrivals</h2>
            <div className="product-grid">
              {newArrivals.map(renderProductCard)}
            </div>
          </section>
        )}

        {/* All Products Section */}
        <section className="products-section">
          <h2>{selectedCat ? cats.find(c => c.id === selectedCat)?.name || 'Sản phẩm' : '📦 Tất cả sản phẩm'}</h2>
          <div className="product-grid">
            {filtered.map(renderProductCard)}
          </div>
        </section>
      </main>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.login(username, password);
      navigate('/');
    } catch {
      alert('Login failed');
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function CartPage() {
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cart
      .get()
      .then((res) => setItems(res.data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: number) => {
    await cart.removeItem(id);
    setItems(items.filter((i: any) => i.id !== id));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="cart-page">
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <p>Cart is empty</p>
      ) : (
        <ul className="cart-items">
          {items.map((item: any) => (
            <li key={item.id}>
              <span>{item.product?.name}</span>
              <span>Qty: {item.quantity}</span>
              <button onClick={() => handleRemove(item.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setUser('User');
    }
  }, []);

  const handleLogout = () => {
    auth.logout();
    setUser(null);
  };

  return (
    <div className="app">
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/policy" element={<Policy />} />
      </Route>
    </Routes>
  </div>
  );
}

export default App;
