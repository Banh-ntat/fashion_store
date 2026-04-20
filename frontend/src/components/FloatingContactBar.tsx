import "../styles/components/FloatingContactBar.css";

const TIKTOK_DEFAULT = "https://www.tiktok.com/@uth_hcm";
const FACEBOOK_DEFAULT =
  "https://www.facebook.com/TruongDHGiaothongvantaiTPHCM";

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
          className="floating-contact-bar__btn floating-contact-bar__btn--brand"
          aria-label="TikTok @uth_hcm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/social/tiktok.png"
            alt=""
            className="floating-contact-bar__logo"
            width={52}
            height={52}
            decoding="async"
          />
        </a>
      </span>
      <span className="floating-contact-bar__slot">
        <a
          href={facebookUrl}
          className="floating-contact-bar__btn floating-contact-bar__btn--brand"
          aria-label="Facebook Trường ĐH Giao thông vận tải TP.HCM"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/social/facebook.png"
            alt=""
            className="floating-contact-bar__logo"
            width={52}
            height={52}
            decoding="async"
          />
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
