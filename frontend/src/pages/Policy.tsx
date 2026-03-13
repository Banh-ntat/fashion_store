import { useState } from 'react';
import '../styles/pages/Policy.css';

// ─── Các mục chính sách ───────────────────────────────────────────────────────

const policyData = [
  {
    id: 'shipping',
    icon: '📦',
    title: 'Chính sách giao hàng',
    sections: [
      {
        subtitle: 'Thời gian giao hàng',
        content:
          'Giao hàng tiêu chuẩn trong khu vực TP.HCM mất khoảng 1-2 ngày làm việc. Giao hàng toàn quốc mất 2-5 ngày làm việc tùy địa điểm. Dịch vụ giao hàng nhanh có sẵn khi thanh toán với một khoản phí bổ sung.',
      },
      {
        subtitle: 'Miễn phí vận chuyển',
        content:
          'Chúng tôi miễn phí giao hàng tiêu chuẩn cho tất cả đơn hàng trên 500.000đ. Với đơn hàng dưới mức này, phí vận chuyển là 30.000đ trong TP.HCM và 50.000đ cho giao hàng toàn quốc.',
      },
      {
        subtitle: 'Theo dõi đơn hàng',
        content:
          'Sau khi đơn hàng được gửi đi, bạn sẽ nhận email xác nhận kèm mã theo dõi. Bạn có thể theo dõi đơn hàng theo thời gian thực trên website của chúng tôi hoặc trên nền tảng của đơn vị vận chuyển.',
      },
      {
        subtitle: 'Giao hàng quốc tế',
        content:
          'Hiện tại chúng tôi chỉ giao hàng trong phạm vi Việt Nam. Dịch vụ giao hàng quốc tế sẽ sớm được triển khai.',
      },
    ],
  },
  {
    id: 'return',
    icon: '↩',
    title: 'Chính sách đổi trả',
    sections: [
      {
        subtitle: 'Thời hạn đổi trả 30 ngày',
        content:
          'Chúng tôi chấp nhận đổi hoặc trả hàng trong vòng 30 ngày kể từ khi nhận hàng.',
      },
      {
        subtitle: 'Cách trả hàng',
        content:
          'Để yêu cầu trả hàng, hãy đăng nhập vào tài khoản, vào mục đơn hàng và chọn "Trả hàng".',
      },
      {
        subtitle: 'Hoàn tiền',
        content:
          'Việc hoàn tiền sẽ được xử lý trong vòng 5-7 ngày làm việc sau khi chúng tôi nhận được sản phẩm trả lại.',
      },
      {
        subtitle: 'Sản phẩm hỏng hoặc giao sai',
        content:
          'Nếu bạn nhận được sản phẩm bị hỏng hoặc không đúng, vui lòng liên hệ bộ phận hỗ trợ trong vòng 48 giờ.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: '🔒',
    title: 'Chính sách bảo mật',
    sections: [
      {
        subtitle: 'Dữ liệu chúng tôi thu thập',
        content:
          'Chúng tôi thu thập thông tin bạn cung cấp trực tiếp như tên, email và địa chỉ.',
      },
      {
        subtitle: 'Cách chúng tôi sử dụng dữ liệu',
        content:
          'Dữ liệu của bạn được sử dụng để xử lý đơn hàng và cải thiện trải nghiệm mua sắm.',
      },
      {
        subtitle: 'Bảo mật dữ liệu',
        content:
          'Tất cả dữ liệu nhạy cảm được mã hóa bằng công nghệ SSL tiêu chuẩn.',
      },
      {
        subtitle: 'Quyền của bạn',
        content:
          'Bạn có quyền truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân của mình bất cứ lúc nào.',
      },
    ],
  },
  {
    id: 'payment',
    icon: '💳',
    title: 'Chính sách thanh toán',
    sections: [
      {
        subtitle: 'Phương thức thanh toán',
        content:
          'Chúng tôi chấp nhận Visa, Mastercard, MoMo, ZaloPay và chuyển khoản ngân hàng.',
      },
      {
        subtitle: 'Bảo mật thanh toán',
        content:
          'Tất cả giao dịch đều được mã hóa và xử lý qua cổng thanh toán an toàn.',
      },
      {
        subtitle: 'Thanh toán trả góp',
        content:
          'Đối với đơn hàng trên 1.000.000đ, chúng tôi hỗ trợ trả góp 0%.',
      },
    ],
  },
];

// ─── Trang Policy ─────────────────────────────────────────────────────────────

export default function Policy() {
  const [activeSection, setActiveSection] = useState('shipping');

  const activePolicy = policyData.find((p) => p.id === activeSection)!;

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <span className="tag">Minh bạch là ưu tiên hàng đầu</span>
          <h1 className="heroTitle">Chính sách của chúng tôi</h1>
          <p className="heroSubtitle">
            Chúng tôi luôn minh bạch trong mọi hoạt động.
          </p>
        </div>
      </section>

      {/* Nội dung */}
      <section className="section">
        <div className="container">
          <div className="policyLayout">

            {/* Sidebar */}
            <aside className="sidebar">
              <h3 className="sidebarTitle">Danh mục chính sách</h3>

              <nav className="sidebarNav">
                {policyData.map(({ id, icon, title }) => (
                  <button
                    key={id}
                    className={`sidebarBtn ${
                      activeSection === id ? 'sidebarBtnActive' : ''
                    }`}
                    onClick={() => setActiveSection(id)}
                  >
                    <span className="sidebarIcon">{icon}</span>
                    {title}
                  </button>
                ))}
              </nav>

              <div className="contactBox">
                <h4 className="contactBoxTitle">Có câu hỏi?</h4>
                <p className="contactBoxText">
                  Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng 24/7.
                </p>
                <a href="mailto:hello@fashionstore.vn" className="contactBoxBtn">
                  Liên hệ hỗ trợ
                </a>
              </div>
            </aside>

            {/* Content */}
            <div className="content">
              <div className="contentHeader">
                <span className="contentIcon">{activePolicy.icon}</span>
                <h2 className="contentTitle">{activePolicy.title}</h2>
              </div>

              <div className="sections">
                {activePolicy.sections.map(({ subtitle, content }) => (
                  <div key={subtitle} className="policySection">
                    <h3 className="policySectionTitle">{subtitle}</h3>
                    <p className="policySectionText">{content}</p>
                  </div>
                ))}
              </div>

              <div className="lastUpdated">
                Cập nhật lần cuối: 1 tháng 3, 2025
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}