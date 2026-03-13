import { Link } from "react-router-dom";
import "../styles/components/Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">

      {/* ── Top accent line ── */}
      <div className="footerTopBar" />

        {/* ── Main body ── */}
        <div className="footerMain">

          {/* LEFT — Brand statement */}
          <div className="footerLeft">
            <div className="footerBrandMark">
              <div className="brandIcon">F</div>
              <span className="brandWordmark">FashionStore</span>
            </div>

            <p className="footerTagline">
              Thời trang hiện đại.<br />
              Chất lượng tốt và giá hợp lý.
            </p>

            <div className="footerSocials">
              {[
                { label: "IG", title: "Instagram" },
                { label: "FB", title: "Facebook" },
                { label: "TK", title: "TikTok" },
                { label: "PT", title: "Pinterest" },
              ].map((s) => (
                <a key={s.label} href="#" className="socialPill" title={s.title}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* DIVIDER */}
          <div className="footerDividerV" />

          {/* CENTER — Nav links */}
          <div className="footerCenter">
            <p className="footerColLabel">Điều hướng</p>
            <nav className="footerNav">
              {[
                { to: "/", label: "Trang Chủ" },
                { to: "/about", label: "Giới Thiệu" },
                { to: "/policy", label: "Chính Sách" },
                { to: "/cart", label: "Giỏ Hàng" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="footerNavLink">
                  <span className="navLinkArrow">→</span>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* RIGHT — Contact */}
          <div className="footerRight">
            <p className="footerColLabel">Liên hệ</p>
            <div className="footerContacts">
              <a href="mailto:hello@fashionstore.vn" className="contactRow">
                <svg className="contactRowIcon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="16" height="12" rx="2"/>
                  <path d="M2 7l8 5 8-5"/>
                </svg>
                fashionstore.vn
              </a>
              <a href="tel:+84012345789" className="contactRow">
                <svg className="contactRowIcon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 4a1 1 0 011-1h2.5a1 1 0 011 .75l.7 2.8a1 1 0 01-.29 1l-1.1 1.1a11 11 0 004.5 4.5l1.1-1.1a1 1 0 011-.29l2.8.7a1 1 0 01.75 1V16a1 1 0 01-1 1C7.16 17 3 12.84 3 8V4z"/>
                </svg>
                +84 0123 4567 789
              </a>
            </div>

            {/* Mini map dot decoration */}
            <div className="footerMapDot">
              <div className="mapPulse" />
              <span>Hồ Chí Minh, Việt Nam</span>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="footerBottom">
          <p className="footerCopy">© {currentYear} FashionStore. All rights reserved.</p>
        </div>

    </footer>
  );
}