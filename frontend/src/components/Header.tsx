import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";
import "../styles/components/Header.css";

/* Icons */

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

/* Navigation */

const navLinks = [
  { to: "/", label: "Trang Chủ" },
  { to: "/about", label: "Giới Thiệu" },
  { to: "/policy", label: "Chính Sách" }
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="header">
        <div className="headerInner">

          {/* Logo */}
          <Link to="/" className="logo" onClick={closeMenu}>
            <div className="logoMark">F</div>
            <span className="logoText">
              Fashion<span>Store</span>
            </span>
          </Link>

          <nav className="nav">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `navLink ${isActive ? "navLinkActive" : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Search */}
          <div className="searchWrapper">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="actions">

            <button
              className="iconBtn"
              onClick={() => navigate("/cart")}
            >
              <CartIcon />
              <span className="cartBadge">3</span>
            </button>

            <button
              className="iconBtn"
              onClick={() => navigate("/login")}
            >
              <UserIcon />
            </button>

            <Link to="/login" className="loginBtn">
              Đăng Nhập <ArrowIcon />
            </Link>

            <button
              className={`hamburger ${menuOpen ? "hamburgerOpen" : ""}`}
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
      <div className={`mobileMenu ${menuOpen ? "mobileMenuOpen" : ""}`}>

        <div className="mobileSearchWrapper">
          <SearchBar />
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
          <Link
            to="/login"
            className="mobileLoginBtn"
            onClick={closeMenu}
          >
            Đăng Nhập / Đăng Ký
          </Link>
        </div>

      </div>
    </>
  );
}