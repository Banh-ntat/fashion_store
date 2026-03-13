import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import '../styles/components/Header.css';

// ─── Icon Components ─────────────────────────────────

const SearchIcon = () => (
  <svg className="searchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// ─── Navigation Links ───────────────────────────────

const navLinks = [
  { to: '/', label: 'Trang Chủ' },
  { to: '/about', label: 'Giới Thiệu' },
  { to: '/services', label: 'Dịch Vụ' },
  { to: '/policy', label: 'Chính Sách' },
];

// ─── Header Component ───────────────────────────────

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setMenuOpen(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="header">
        <div className="container headerInner">

          {/* Logo */}
          <Link to="/" className="logo" onClick={closeMenu}>
            <div className="logoMark">F</div>
            <span className="logoText">
              Fashion<span>Store</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `navLink ${isActive ? 'navLinkActive' : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Search */}
          <div className="searchWrapper">
            <form onSubmit={handleSearch} className="searchBar">
              <SearchIcon />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="searchInput"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="actions">

            <button
              className="iconBtn"
              onClick={() => navigate('/cart')}
            >
              <CartIcon />
              <span className="cartBadge">3</span>
            </button>

            <button
              className="iconBtn"
              onClick={() => navigate('/login')}
            >
              <UserIcon />
            </button>

            <Link to="/login" className="loginBtn">
              Đăng Nhập <ArrowIcon />
            </Link>

            <button
              className={`hamburger ${menuOpen ? 'hamburgerOpen' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="hamburgerLine" />
              <span className="hamburgerLine" />
              <span className="hamburgerLine" />
            </button>

          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`mobileMenu ${menuOpen ? 'mobileMenuOpen' : ''}`}>

        <div className="mobileSearchWrapper">
          <form onSubmit={handleSearch} className="searchBar">
            <SearchIcon />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="searchInput"
            />
          </form>
        </div>

        <nav className="mobileNavLinks">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="mobileNavLink"
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mobileActions">
          <Link to="/login" className="mobileLoginBtn" onClick={closeMenu}>
            Đăng Nhập / Đăng Ký
          </Link>
        </div>

      </div>
    </>
  );
}