import "../styles/pages/About.css";

const features = [
  {
    icon: '◈',
    title: 'Chất Lượng Cao',
    desc: 'Mỗi sản phẩm được chọn lọc kỹ lưỡng từ các nhà sản xuất uy tín, sử dụng nguyên liệu cao cấp và tay nghề thượng hạng.',
  },
  {
    icon: '◎',
    title: 'Giao Hàng Nhanh',
    desc: 'Miễn phí giao hàng nhanh cho đơn từ 500.000đ. Đơn hàng được giao trong vòng 2–3 ngày làm việc.',
  },
  {
    icon: '◇',
    title: 'Giá Tốt Nhất',
    desc: 'Chúng tôi làm việc trực tiếp với nhà sản xuất để mang đến chất lượng tốt nhất với mức giá cạnh tranh nhất.',
  },
];

const team = [
  {
    name: 'Linh Nguyễn',
    role: 'Giám Đốc Sáng Tạo',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
  },
  {
    name: 'Minh Trần',
    role: 'Trưởng Bộ Phận Thiết Kế',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
  },
  {
    name: 'An Phạm',
    role: 'Chiến Lược Thương Hiệu',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
  },
];

export default function About() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="heroInner">

            <div className="heroText">
              <span className="tag">Thành lập 2019</span>

              <h1 className="heroTitle">
                Về Thương Hiệu Của Chúng Tôi
              </h1>

              <p className="heroSubtitle">
                Chúng tôi tin rằng thời trang không chỉ là trang phục —
                đó là cách thể hiện bản thân, là tuyên ngôn giá trị
                và là cầu nối giữa các nền văn hóa.
              </p>
            </div>

            <div className="heroImageGrid">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=500&fit=crop"
                alt="Thương hiệu thời trang"
                className="heroImg1"
              />

              <img
                src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=280&fit=crop"
                alt="Bộ sưu tập thời trang"
                className="heroImg2"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Story */}
      <section className="storySection">
        <div className="container">
          <div className="storyGrid">

            <div className="storyImageWrapper">
              <img
                src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&h=700&fit=crop"
                alt="Câu chuyện của chúng tôi"
                className="storyImage"
              />
              <div className="storyImageAccent"></div>
            </div>

            <div className="storyContent">
              <span className="sectionTag">Câu Chuyện Của Chúng Tôi</span>

              <h2 className="storyTitle">
                Kiến Tạo Phong Cách,<br />Xây Dựng Tự Tin
              </h2>

              <p className="storyText">
                Được thành lập năm 2019 tại trung tâm TP. Hồ Chí Minh,
                FashionStore ra đời từ một ý tưởng đơn giản:
                mọi người đều xứng đáng được mặc những bộ trang phục đẹp,
                chất lượng mà không phải đánh đổi giá trị hay ngân sách của mình.
              </p>

              <p className="storyText">
                Đội ngũ nhà thiết kế và biên tập viên đầy nhiệt huyết
                của chúng tôi không ngừng tìm kiếm những chất liệu tốt nhất
                và những phong cách sáng tạo nhất.
              </p>

              <p className="storyText">
                Ngày nay, chúng tôi phục vụ hơn 50.000 khách hàng
                trên khắp Việt Nam và vẫn đang không ngừng phát triển.
              </p>

              <div className="storyStats">

                {[
                  { num: '2019', label: 'Năm thành lập' },
                  { num: '50K+', label: 'Khách hàng' },
                  { num: '500+', label: 'Sản phẩm' },
                ].map(({ num, label }) => (
                  <div key={label} className="storyStat">
                    <span className="storyStatNum">{num}</span>
                    <span className="storyStatLabel">{label}</span>
                  </div>
                ))}

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="featuresSection">
        <div className="container">

          <div className="featureHeader">
            <span className="sectionTag">Tại Sao Chọn Chúng Tôi</span>
            <h2 className="sectionTitle">Cam Kết Của Chúng Tôi</h2>
            <p className="sectionSubtitle">
              Tất cả những gì chúng tôi làm đều hướng đến bạn
            </p>
          </div>

          <div className="featuresGrid">

            {features.map(({ icon, title, desc }) => (
              <div key={title} className="featureCard">
                <div className="featureIcon">{icon}</div>
                <h3 className="featureTitle">{title}</h3>
                <p className="featureDesc">{desc}</p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* Team */}
      <section className="teamSection">
        <div className="container">

          <div className="featureHeader">
            <span className="sectionTag">Đội Ngũ Của Chúng Tôi</span>
            <h2 className="sectionTitle">Những Người Sáng Tạo</h2>
            <p className="sectionSubtitle">
              Những con người đam mê đứng sau thương hiệu
            </p>
          </div>

          <div className="teamGrid">

            {team.map(({ name, role, image }) => (
              <div key={name} className="teamCard">

                <div className="teamImageWrapper">
                  <img
                    src={image}
                    alt={name}
                    className="teamImage"
                  />
                </div>

                <h3 className="teamName">{name}</h3>
                <p className="teamRole">{role}</p>

              </div>
            ))}

          </div>
        </div>
      </section>
    </>
  );
}