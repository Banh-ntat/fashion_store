import "../styles/components/FloatingContactBar.css";

const TIKTOK_DEFAULT = "https://www.tiktok.com/@uth_hcm";
const FACEBOOK_DEFAULT = "https://www.facebook.com/TruongDHGiaothongvantaiTPHCM";
const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=70+Đ.+Tô+Ký,+Tân+Chánh+Hiệp,+Trung+Mỹ+Tây,+Hồ+Chí+Minh,+Vietnam";

const TopArrow = () => (
  <svg
    className="floating-contact-bar__icon floating-contact-bar__icon--top"
    viewBox="0 0 24 24"
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="floating-contact-bar__social-icon floating-contact-bar__social-icon--tiktok">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="floating-contact-bar__social-icon floating-contact-bar__social-icon--facebook">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const GoogleMapsIcon = () => (
  <svg viewBox="0 0 24 24" className="floating-contact-bar__social-icon floating-contact-bar__social-icon--maps">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function FloatingContactBar() {
  const tiktokUrl =
    (import.meta.env.VITE_TIKTOK_URL as string | undefined)?.trim() ||
    TIKTOK_DEFAULT;
  const facebookUrl =
    (import.meta.env.VITE_FACEBOOK_URL as string | undefined)?.trim() ||
    FACEBOOK_DEFAULT;

  return (
    <aside className="floating-contact-bar" aria-label="Mạng xã hội & điều hướng">
      <span className="floating-contact-bar__slot">
        <a
          href={tiktokUrl}
          className="floating-contact-bar__btn floating-contact-bar__btn--brand floating-contact-bar__btn--tiktok"
          aria-label="TikTok @uth_hcm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <TikTokIcon />
        </a>
      </span>
      <span className="floating-contact-bar__slot">
        <a
          href={facebookUrl}
          className="floating-contact-bar__btn floating-contact-bar__btn--brand floating-contact-bar__btn--facebook"
          aria-label="Facebook Trường ĐH Giao thông vận tải TP.HCM"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FacebookIcon />
        </a>
      </span>
      <span className="floating-contact-bar__slot">
        <a
          href={GOOGLE_MAPS_URL}
          className="floating-contact-bar__btn floating-contact-bar__btn--brand floating-contact-bar__btn--maps"
          aria-label="Xem địa chỉ trên Google Maps - 70 Đ. Tô Ký, Tân Chánh Hiệp, Trung Mỹ Tây, Hồ Chí Minh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GoogleMapsIcon />
        </a>
      </span>
      <span className="floating-contact-bar__slot">
        <button
          type="button"
          className="floating-contact-bar__btn floating-contact-bar__btn--top"
          onClick={scrollToTop}
          aria-label="Lên đầu trang"
        >
          <TopArrow />
          TOP
        </button>
      </span>
    </aside>
  );
}
