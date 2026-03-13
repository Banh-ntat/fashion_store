import { Link } from 'react-router-dom';
import '../styles/components/Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footerGrid">

          {/* Brand */}
          <div>
            <div className="brandLogo">
              <div className="brandMark">F</div>
              <span className="brandName">FashionStore</span>
            </div>

            <p className="brandDesc">
              Điểm đến của bạn cho thời trang được tuyển chọn kỹ lưỡng,
              kết hợp hoàn hảo giữa phong cách hiện đại và vẻ đẹp vượt
              thời gian. Chất lượng bạn cảm nhận được, giá cả bạn yêu thích.
            </p>

            <div className="socialLinks">
              <a href="#" className="socialLink">IG</a>
              <a href="#" className="socialLink">FB</a>
              <a href="#" className="socialLink">TK</a>
              <a href="#" className="socialLink">PT</a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="colTitle">Liên Kết Nhanh</h4>

            <ul className="linkList">
              {[
                { to: '/', label: 'Trang Chủ' },
                { to: '/about', label: 'Giới Thiệu' },
                { to: '/services', label: 'Dịch Vụ' },
                { to: '/policy', label: 'Chính Sách' },
                { to: '/cart', label: 'Giỏ Hàng' },
                { to: '/login', label: 'Tài Khoản' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="footerLink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="colTitle">Liên Hệ</h4>

            <ul className="contactList">

              <li className="contactItem">
                <svg className="contactIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                hello@fashionstore.vn
              </li>

              <li className="contactItem">
                <svg className="contactIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72"/>
                </svg>
                +84 (0) 28 3333 4444
              </li>

              <li className="contactItem">
                <svg className="contactIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                123 Nguyễn Huệ, Quận 1 <br/>
                TP. Hồ Chí Minh, Việt Nam
              </li>

            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="footerBottom">
          <p className="copyright">
            © {currentYear} FashionStore. Tất cả quyền được bảo lưu.
          </p>

          <div className="legalLinks">
            <Link to="/policy" className="legalLink">Bảo Mật</Link>
            <Link to="/policy" className="legalLink">Điều Khoản</Link>
            <Link to="/policy" className="legalLink">Cookies</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}