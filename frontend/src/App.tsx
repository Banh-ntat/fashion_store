import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { products, categories, cart, auth } from './api/client';
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
}

interface Category {
  id: number;
  name: string;
  description: string;
}

function Home() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([products.list(), categories.list()])
      .then(([pRes, cRes]) => {
        setProductsList(pRes.data.results || pRes.data);
        setCats(cRes.data.results || cRes.data);
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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="home">
      <aside className="sidebar">
        <h3>Categories</h3>
        <ul>
          <li>
            <button
              className={selectedCat === null ? 'active' : ''}
              onClick={() => setSelectedCat(null)}
            >
              All
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
        <h2>Products</h2>
        <div className="product-grid">
          {filtered.map((p) => (
            <div key={p.id} className="product-card">
              <img src={p.image} alt={p.name} />
              <h4>{p.name}</h4>
              <p className="price">
                ${p.price}
                {p.old_price && <span className="old-price">${p.old_price}</span>}
              </p>
              <button onClick={() => handleAddToCart(p.id)}>Add to Cart</button>
            </div>
          ))}
        </div>
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
      <nav className="navbar">
        <Link to="/" className="logo">Fashion Store</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/cart">Cart</Link>
          {user ? (
            <button onClick={handleLogout}>Logout</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </div>
  );
}

export default App;
