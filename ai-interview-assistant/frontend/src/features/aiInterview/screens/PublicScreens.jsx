import { Button, Pill, SectionCard } from "../../../components/ui";

export function LandingScreen({ onEnter, onLogin }) {
  return (
    <div className="landing">
      <section className="hero-card">
        <div className="hero-copy">
          <Pill tone="info">Nền tảng luyện phỏng vấn ứng dụng AI</Pill>
          <h2>Luyện thông minh hơn. Tuyển nhanh hơn. Mọi buổi phỏng vấn đều đo lường được.</h2>
          <p>
            Tải CV, khớp vị trí tức thì, mô phỏng phỏng vấn bằng giọng nói hoặc văn bản, và nhận chấm điểm AI minh
            bạch để cả ứng viên lẫn nhà tuyển dụng đều tin tưởng.
          </p>
          <div className="hero-cta">
            <Button onClick={onEnter}>Bắt Đầu Trải Nghiệm</Button>
            <Button variant="soft" onClick={onLogin}>
              Đăng Nhập
            </Button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="glass-card">
            <h3>Phiên AI thời gian thực</h3>
            <p>Ghi âm giọng nói, đồng bộ transcript và chấm điểm mức tự tin trong một bảng duy nhất.</p>
            <div className="wave-strip" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, idx) => (
                <span key={idx} style={{ animationDelay: `${idx * 0.08}s` }} />
              ))}
            </div>
            <div className="hero-grid">
              <span>Transcript</span>
              <strong>Thời gian thực</strong>
              <span>Rubric</span>
              <strong>Theo vị trí</strong>
              <span>Kiểm soát thiên lệch</span>
              <strong>Đã bật</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <SectionCard
          title="Trải Nghiệm Ứng Viên"
          subtitle="Từ tải CV đến coaching phỏng vấn"
          action={<Pill tone="success">Xuyên suốt</Pill>}
        >
          <p>Câu hỏi thích ứng theo năng lực, phản hồi theo transcript và phân tích tiến độ theo thời gian.</p>
        </SectionCard>
        <SectionCard
          title="Bảng Điều Khiển Tuyển Dụng"
          subtitle="Đánh giá độ phù hợp và so sánh ứng viên"
          action={<Pill tone="info">Hợp tác</Pill>}
        >
          <p>Thẻ điểm thống nhất và so sánh song song trên mọi JD đang mở.</p>
        </SectionCard>
        <SectionCard
          title="Quản Trị & Tuân Thủ"
          subtitle="Kiểm soát chất lượng AI và chính sách"
          action={<Pill tone="warning">Sẵn sàng vận hành</Pill>}
        >
          <p>Vòng đời ngân hàng câu hỏi, định tuyến mô hình, ngưỡng an toàn và kiểm toán rõ ràng.</p>
        </SectionCard>
      </section>
    </div>
  );
}

export function AuthScreen({
  authForm,
  setAuthForm,
  onContinue,
  onBack,
  authError,
}) {
  return (
    <div className="auth-layout">
      <SectionCard title="Chào mừng quay lại" subtitle="Đăng nhập để tiếp tục không gian phỏng vấn của bạn">
        <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
          <label>
            Email công việc
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              placeholder="name@company.com"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              placeholder="Nhập mật khẩu"
            />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={authForm.keepSignedIn}
              onChange={(event) => setAuthForm({ ...authForm, keepSignedIn: event.target.checked })}
            />
            Duy trì đăng nhập
          </label>
          <div className="form-actions">
            <Button variant="ghost" onClick={onBack}>
              Quay Lại Trang Chủ
            </Button>
            <Button onClick={onContinue}>Đăng Nhập</Button>
          </div>
          {authError ? <p className="auth-error">{authError}</p> : null}
        </form>
      </SectionCard>
    </div>
  );
}
