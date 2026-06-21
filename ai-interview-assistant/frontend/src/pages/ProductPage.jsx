import { BarChart3, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/marketing/SiteFooter";
import SiteHeader from "../components/marketing/SiteHeader";

const modules = [
  {
    icon: Users,
    title: "Trải nghiệm ứng viên",
    desc: "Kịch bản phỏng vấn theo vị trí, phản hồi ngay sau mỗi câu trả lời.",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: BarChart3,
    title: "Bảng điều khiển tuyển dụng",
    desc: "Tổng hợp điểm năng lực và so sánh ứng viên theo rubric.",
    image:
      "https://images.unsplash.com/photo-1551281044-8b1b2d4b8d8b?auto=format&fit=crop&w=900&q=80",
  },
  {
    icon: ShieldCheck,
    title: "Quản trị hệ thống",
    desc: "Phân quyền truy cập và lưu vết cho toàn bộ quy trình đánh giá.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
  },
];

export default function ProductPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden grid gap-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm lg:grid-cols-12 lg:items-center">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-[var(--color-primary-soft)] opacity-40 blur-3xl pointer-events-none" />
          
          <div className="lg:col-span-6 relative z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Sản phẩm</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
              Bộ công cụ phỏng vấn AI cho đội tuyển dụng.
            </h1>
            <p className="mt-4 text-base text-[var(--color-text-muted)] leading-relaxed">
              Thiết kế cho nhà tuyển dụng và quản lý tuyển dụng cần dữ liệu rõ ràng để ra quyết
              định nhanh.
            </p>
            <Link
              to="/bang-gia"
              className="mt-6 inline-flex rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] active:scale-95 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
            >
              Xem bảng giá
            </Link>
          </div>
          <div className="lg:col-span-6 relative z-10">
            <img
              src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1100&q=80"
              alt="Tổng quan sản phẩm AI Interview"
              className="h-72 w-full rounded-2xl object-cover opacity-90 border border-[var(--color-border)] shadow-sm"
              loading="lazy"
            />
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <img src={item.image} alt={item.title} className="h-40 w-full object-cover opacity-90" loading="lazy" />
                <div className="p-5 border-t border-[var(--color-border)]">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-[var(--color-text)]">{item.title}</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
