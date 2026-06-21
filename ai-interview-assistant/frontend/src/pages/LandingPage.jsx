import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/marketing/SiteFooter";
import SiteHeader from "../components/marketing/SiteHeader";

const featureCards = [
  {
    title: "Trải nghiệm ứng viên",
    description: "Mô phỏng hội thoại AI và phản hồi ngay sau mỗi câu trả lời.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Bảng điều khiển tuyển dụng",
    description: "So sánh năng lực ứng viên theo mức phù hợp vị trí trên một màn hình.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Quản trị và tuân thủ",
    description: "Phân quyền rõ ràng, lưu vết đầy đủ, dễ kiểm tra và mở rộng.",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  },
];

const bars = [28, 44, 26, 54, 38, 46, 30, 50, 34, 42, 26, 36];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden grid gap-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm lg:grid-cols-12 lg:items-center"
        >
          {/* Decorative background lights */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-[var(--color-primary-soft)] opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-72 h-72 rounded-full bg-[var(--color-secondary-soft)] opacity-30 blur-3xl pointer-events-none" />

          <div className="lg:col-span-7 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)] animate-pulse" />
              Nền tảng phỏng vấn AI cho doanh nghiệp
            </div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-[var(--color-text)] sm:text-5xl tracking-tight">
              Luyện thông minh hơn.
              <br />
              <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                Tuyển nhanh hơn.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
              Tập trung mô phỏng phỏng vấn, chấm điểm năng lực và báo cáo tuyển dụng trong một
              luồng duy nhất.
            </p>

            <div className="mt-8 flex items-center">
              <Link
                to="/login"
                className="inline-flex items-center rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] active:scale-95 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
              >
                Bắt đầu trải nghiệm
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative z-10">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-md hover:shadow-lg transition-shadow duration-300">
              <img
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80"
                alt="Minh họa phiên phỏng vấn AI"
                className="h-48 w-full object-cover opacity-90"
                loading="lazy"
              />
              <div className="p-5 border-t border-[var(--color-border)]">
                <p className="text-sm font-bold text-[var(--color-text)]">Phiên AI thời gian thực</p>
                <div className="mt-4 flex h-14 items-end gap-1">
                  {bars.map((height, index) => (
                    <motion.span
                      key={`${height}-${index}`}
                      style={{ height }}
                      className="w-2 rounded-full bg-[var(--color-primary)]"
                      animate={{ scaleY: [0.7, 1, 0.8, 1] }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.04,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-[var(--color-surface)] p-3 border border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Transcript</p>
                    <p className="font-bold text-[var(--color-text)]">Theo thời gian thực</p>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface)] p-3 border border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Rubric</p>
                    <p className="font-bold text-[var(--color-text)]">Theo vị trí</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section id="features" className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-[var(--color-text)] sm:text-3xl">
              3 trụ cột cho quy trình phỏng vấn
            </h2>
            <Link to="/san-pham" className="text-sm font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors">
              Xem trang sản phẩm &rarr;
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-40 w-full object-cover opacity-90"
                  loading="lazy"
                />
                <div className="p-5 border-t border-[var(--color-border)]">
                  <p className="text-lg font-bold text-[var(--color-text)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
