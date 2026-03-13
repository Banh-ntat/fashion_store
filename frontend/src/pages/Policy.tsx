import "../styles/pages/Policy.css";

const policies = [
  {
    title: "Chính sách giao hàng",
    desc: "Chúng tôi giao hàng toàn quốc trong 2–5 ngày làm việc tùy khu vực.",
    accent: "#3B82F6",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Truck body */}
        <rect x="4" y="24" width="38" height="22" rx="3" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2"/>
        {/* Cargo box */}
        <rect x="8" y="16" width="26" height="12" rx="2" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1.5"/>
        {/* Truck cab */}
        <path d="M42 32 L42 40 Q42 46 48 46 L58 46 L58 36 L52 28 L42 28 Z" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2"/>
        <path d="M44 28 L52 28 L58 36 L44 36 Z" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1.5"/>
        {/* Wheels */}
        <circle cx="14" cy="46" r="6" fill="#1D4ED8" stroke="#3B82F6" strokeWidth="1.5"/>
        <circle cx="14" cy="46" r="2.5" fill="#DBEAFE"/>
        <circle cx="50" cy="46" r="6" fill="#1D4ED8" stroke="#3B82F6" strokeWidth="1.5"/>
        <circle cx="50" cy="46" r="2.5" fill="#DBEAFE"/>
        {/* Speed lines */}
        <line x1="2" y1="30" x2="10" y2="30" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2" y1="35" x2="7" y2="35" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2" y1="40" x2="9" y2="40" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Chính sách đổi trả",
    desc: "Bạn có thể đổi hoặc trả sản phẩm trong vòng 30 ngày nếu chưa sử dụng.",
    accent: "#10B981",
    bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Box */}
        <rect x="12" y="20" width="24" height="24" rx="3" fill="#A7F3D0" stroke="#10B981" strokeWidth="2"/>
        <line x1="12" y1="28" x2="36" y2="28" stroke="#10B981" strokeWidth="1.5"/>
        <path d="M21 24 L27 24" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
        {/* Arrow return */}
        <path d="M38 30 Q50 20 52 34" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M48 38 L52 34 L56 38" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        {/* Checkmark */}
        <circle cx="44" cy="48" r="8" fill="#10B981"/>
        <path d="M40 48 L43 51 L48 45" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Thanh toán",
    desc: "Hỗ trợ thanh toán khi nhận hàng (COD) và các phương thức thanh toán trực tuyến.",
    accent: "#F59E0B",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Card */}
        <rect x="8" y="18" width="48" height="30" rx="5" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2"/>
        <rect x="8" y="26" width="48" height="8" fill="#F59E0B" opacity="0.6"/>
        {/* Chip */}
        <rect x="14" y="34" width="12" height="8" rx="2" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5"/>
        {/* Dots */}
        <circle cx="38" cy="38" r="2.5" fill="#F59E0B" opacity="0.8"/>
        <circle cx="44" cy="38" r="2.5" fill="#F59E0B"/>
        <circle cx="50" cy="38" r="2.5" fill="#F59E0B" opacity="0.6"/>
        {/* Wifi signal */}
        <path d="M30 20 Q32 17 34 20" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M27 22 Q32 15 37 22" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    title: "Bảo mật thông tin",
    desc: "Thông tin cá nhân của khách hàng luôn được bảo mật tuyệt đối.",
    accent: "#8B5CF6",
    bg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shield */}
        <path d="M32 8 L52 16 L52 32 Q52 46 32 56 Q12 46 12 32 L12 16 Z" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="2"/>
        <path d="M32 14 L46 20 L46 32 Q46 42 32 50 Q18 42 18 32 L18 20 Z" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5"/>
        {/* Lock */}
        <rect x="25" y="33" width="14" height="10" rx="2" fill="#8B5CF6"/>
        <path d="M27 33 L27 29 Q27 24 32 24 Q37 24 37 29 L37 33" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <circle cx="32" cy="38" r="2" fill="white"/>
      </svg>
    ),
  },
  {
    title: "Đóng gói sản phẩm",
    desc: "Tất cả sản phẩm đều được đóng gói cẩn thận trước khi giao đến khách hàng.",
    accent: "#EC4899",
    bg: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Box bottom */}
        <path d="M10 30 L32 40 L54 30 L54 52 Q54 54 52 55 L32 62 L12 55 Q10 54 10 52 Z" fill="#FBCFE8" stroke="#EC4899" strokeWidth="2"/>
        {/* Box top left */}
        <path d="M10 30 L32 20 L32 40 L10 30 Z" fill="#F9A8D4" stroke="#EC4899" strokeWidth="1.5"/>
        {/* Box top right */}
        <path d="M54 30 L32 20 L32 40 L54 30 Z" fill="#FBCFE8" stroke="#EC4899" strokeWidth="1.5"/>
        {/* Ribbon horizontal */}
        <path d="M10 30 L54 30" stroke="#EC4899" strokeWidth="2"/>
        <path d="M32 20 L32 62" stroke="#EC4899" strokeWidth="2"/>
        {/* Bow */}
        <path d="M32 18 Q26 12 22 16 Q18 20 26 22 Z" fill="#EC4899"/>
        <path d="M32 18 Q38 12 42 16 Q46 20 38 22 Z" fill="#BE185D"/>
        <circle cx="32" cy="20" r="3" fill="#EC4899"/>
      </svg>
    ),
  },
  {
    title: "Cam kết chất lượng",
    desc: "Chúng tôi cam kết cung cấp sản phẩm chính hãng và chất lượng cao.",
    accent: "#EF4444",
    bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Medal ribbon */}
        <path d="M26 8 L38 8 L38 30 L32 26 L26 30 Z" fill="#FCA5A5" stroke="#EF4444" strokeWidth="1.5"/>
        {/* Medal circle */}
        <circle cx="32" cy="42" r="16" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2"/>
        <circle cx="32" cy="42" r="12" fill="#FCA5A5" stroke="#EF4444" strokeWidth="1.5"/>
        {/* Star */}
        <path d="M32 32 L34 38 L40 38 L35.5 42 L37.5 48 L32 44.5 L26.5 48 L28.5 42 L24 38 L30 38 Z" fill="#EF4444"/>
      </svg>
    ),
  },
];

export default function Policy() {
  return (
    <>
      <section className="hero">
        <div className="heroBlobLeft" />
        <div className="heroBlobRight" />
        <div className="heroStripe" />
        <div className="heroStripe2" />
        <div className="container-narrow">
          <h1 className="heroTitle"><span>Chính sách</span></h1>
          <p className="heroSubtitle">
            Những chính sách giúp đảm bảo trải nghiệm mua sắm minh bạch và an toàn
            cho khách hàng.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="policyGrid">
            {policies.map((p) => (
              <div
                key={p.title}
                className="policyCard"
                style={{ "--card-accent": p.accent, "--card-bg": p.bg } as React.CSSProperties}
              >
                <div className="policyIconWrap">
                  <div className="policyIconInner">
                    {p.icon}
                  </div>
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="policyAccentBar" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}