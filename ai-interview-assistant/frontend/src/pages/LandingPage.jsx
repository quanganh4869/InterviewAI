import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  Video,
  Award,
  FileText,
  BarChart3,
  Brain,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Play,
  Users,
  Clock,
  Smile,
  Mic
} from "lucide-react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/marketing/SiteFooter";
import SiteHeader from "../components/marketing/SiteHeader";

const featureCards = [
  {
    title: "Trải nghiệm ứng viên",
    description: "Mô phỏng hội thoại AI chân thực. Cung cấp câu hỏi động bám sát CV và JD, giúp luyện tập phản xạ phỏng vấn tốt nhất.",
    icon: Smile,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Bảng điều khiển tuyển dụng",
    description: "So sánh trực quan năng lực của các ứng viên theo mức độ phù hợp vị trí trên một màn hình duy nhất, tối ưu quy trình lọc hồ sơ.",
    icon: BarChart3,
    color: "from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Đánh giá chuẩn hóa AI",
    description: "Phân tích câu trả lời bằng Whisper & LLM để chấm điểm dựa trên rubrics chuẩn hóa, cung cấp phản hồi điểm mạnh & điểm yếu chi tiết.",
    icon: Brain,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  },
];

const metrics = [
  { label: "Lượt phỏng vấn AI", value: "45,000+", icon: Play },
  { label: "Ứng viên tham gia", value: "12,000+", icon: Users },
  { label: "Tỷ lệ cải thiện kỹ năng", value: "94%", icon: Award },
  { label: "Tiết kiệm thời gian tuyển", value: "60%", icon: Clock },
];

const steps = [
  {
    number: "01",
    title: "Tải CV & Chọn JD mục tiêu",
    description: "Hệ thống tự động phân tích kỹ năng từ CV đối sánh với các tiêu chuẩn trong mô tả công việc (JD).",
    icon: FileText
  },
  {
    number: "02",
    title: "Phỏng vấn giả lập với AI",
    description: "Gặp gỡ người phỏng vấn AI với giọng nói tự nhiên, phản xạ thời gian thực qua camera và micrô.",
    icon: Video
  },
  {
    number: "03",
    title: "Nhận báo cáo & Rubrics",
    description: "Báo cáo chi tiết điểm số của từng kỹ năng, phân tích lỗi sai và đưa ra các mẹo cải thiện hữu ích.",
    icon: ShieldCheck
  }
];

export default function LandingPage() {
  const [demoStep, setDemoStep] = useState(0);

  // Auto-run simulation step machine for the interactive room mockup
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
      <SiteHeader />

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden grid gap-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 md:p-12 shadow-md lg:grid-cols-12 lg:items-center"
        >
          {/* Decorative ambient lights */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-[var(--color-primary-soft)] opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 rounded-full bg-[var(--color-secondary-soft)] opacity-30 blur-3xl pointer-events-none" />

          <div className="lg:col-span-7 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)] animate-pulse" />
              Nền tảng phỏng vấn AI thông minh số 1
            </div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl tracking-tight">
              Luyện thông minh hơn.
              <br />
              <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                Tuyển dụng nhanh hơn.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-[var(--color-text-muted)]">
              Tối ưu quy trình phỏng vấn thử, đối sánh năng lực CV/JD và nhận báo cáo đánh giá chi tiết từ trợ lý AI chỉ trong vài phút.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] active:scale-95 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20"
              >
                Bắt đầu trải nghiệm ngay
                <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition"
              >
                Tìm hiểu tính năng
              </a>
            </div>
          </div>

          {/* Interactive AI Interview Room Demo */}
          <div className="lg:col-span-5 relative z-10 w-full">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-lg transition-all duration-300 relative">
              {/* Header inside mockup */}
              <div className="bg-[var(--color-surface)] px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text)]">Phòng phỏng vấn AI (Demo)</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80 inline-block" />
                </div>
              </div>

              {/* Video/Avatar Area */}
              <div className="h-44 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur border border-white/10 px-2.5 py-1 rounded-md text-[10px] text-white font-bold flex items-center gap-1.5">
                  <Bot size={12} className="text-blue-400" />
                  <span>HR Interviewer AI</span>
                </div>

                {/* Simulated Waveform Overlay */}
                <div className="absolute bottom-3 right-3 flex items-end gap-0.5 h-6">
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-emerald-400"
                      style={{
                        height: demoStep === 1 ? "100%" : "20%",
                        animation: demoStep === 1 ? `bounce 1.2s infinite alternate` : "none",
                        animationDelay: `${i * 0.15}s`
                      }}
                    />
                  ))}
                </div>

                {/* Interviewer representation */}
                <div className={`p-5 rounded-full border border-blue-500/30 bg-blue-500/10 transition-all duration-500 ${
                  demoStep === 0 || demoStep === 3 ? "scale-105 shadow-[0_0_25px_rgba(59,130,246,0.3)]" : "scale-95 opacity-70"
                }`}>
                  <Bot className="h-10 w-10 text-blue-400" />
                </div>
              </div>

              {/* Chat Simulation Area */}
              <div className="p-4 border-t border-[var(--color-border)] min-h-[160px] flex flex-col gap-3 justify-end text-xs">
                <AnimatePresence mode="wait">
                  {demoStep === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-1 self-start max-w-[85%]"
                    >
                      <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Người phỏng vấn</span>
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-xl rounded-tl-none font-medium leading-relaxed">
                        Chào bạn, hãy giới thiệu sơ lược bản thân và thế mạnh lớn nhất của mình?
                      </div>
                    </motion.div>
                  )}

                  {demoStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-1 self-end items-end max-w-[85%]"
                    >
                      <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Bạn (Đang nói)</span>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-3.5 py-2.5 rounded-xl rounded-tr-none font-bold italic flex items-center gap-2">
                        <span>...</span>
                        <Mic size={12} className="animate-pulse" />
                      </div>
                    </motion.div>
                  )}

                  {demoStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-1 self-end items-end max-w-[85%]"
                    >
                      <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Bạn</span>
                      <div className="bg-[var(--color-primary-soft)] border border-[var(--color-primary-soft)] text-[var(--color-text)] px-3 py-2 rounded-xl rounded-tr-none font-medium leading-relaxed">
                        Tôi là lập trình viên với 3 năm kinh nghiệm React. Thế mạnh lớn nhất của tôi là tối ưu hóa hiệu năng ứng dụng.
                      </div>
                    </motion.div>
                  )}

                  {demoStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex flex-col gap-1 self-start max-w-[85%]">
                        <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Người phỏng vấn</span>
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-xl rounded-tl-none font-medium leading-relaxed">
                          Cảm ơn bạn. AI đánh giá thế mạnh tối ưu hóa của bạn rất phù hợp với yêu cầu của JD này.
                        </div>
                      </div>
                      
                      {/* Floating AI score mockup */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-indigo-600 text-white rounded-lg p-2 flex items-center justify-between shadow-md border border-indigo-500/30"
                      >
                        <span className="font-bold flex items-center gap-1">
                          <Sparkles size={12} />
                          Đánh giá AI
                        </span>
                        <strong className="text-sm bg-white/20 px-2 py-0.5 rounded">8.5/10 (Tốt)</strong>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Metrics Section */}
      <section className="bg-[var(--color-surface-muted)] py-12 border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {metrics.map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                key={item.label}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl flex flex-col items-center text-center shadow-xs hover:shadow-md transition duration-300"
              >
                <div className="p-3 bg-[var(--color-primary-soft)] rounded-xl text-[var(--color-primary)] mb-3">
                  <item.icon size={20} />
                </div>
                <strong className="text-3xl font-extrabold text-[var(--color-text)]">{item.value}</strong>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] mt-1.5">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Pillars Section */}
      <section id="features" className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl font-extrabold text-[var(--color-text)] sm:text-4xl tracking-tight">
            3 trụ cột xây dựng thành công buổi phỏng vấn
          </h2>
          <p className="mt-4 text-base text-[var(--color-text-muted)] leading-relaxed">
            Nền tảng của chúng tôi cung cấp giải pháp toàn diện cho cả ứng viên muốn rèn luyện và doanh nghiệp cần tìm kiếm nhân tài.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((item, idx) => (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              key={item.title}
              className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition duration-300 hover:-translate-y-1.5 hover:shadow-md flex flex-col"
            >
              <div className="relative overflow-hidden h-48 w-full bg-slate-900">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent opacity-80" />
              </div>
              <div className="p-6 border-t border-[var(--color-border)] flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color}`}>
                    <item.icon size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-text)]">{item.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)] flex-1">{item.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* How it works Section */}
      <section className="bg-[var(--color-surface-muted)] py-20 border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl font-extrabold text-[var(--color-text)] sm:text-4xl tracking-tight">
              Quy trình hoạt động tối giản
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-muted)]">
              Chỉ với 3 bước đơn giản để làm quen và đột phá kỹ năng phỏng vấn cùng trợ lý AI.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 relative">
            {/* Connecting line layout for wide screen */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--color-border)] -translate-y-12 z-0" />
            
            {steps.map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                key={item.number}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xs relative z-10 flex flex-col items-center text-center group hover:shadow-md transition duration-300"
              >
                <span className="absolute top-4 right-6 text-4xl font-black text-slate-100 dark:text-slate-800 transition group-hover:scale-110">
                  {item.number}
                </span>
                <div className="p-4 bg-[var(--color-primary-soft)] rounded-2xl text-[var(--color-primary)] mb-5">
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text)] mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 p-8 md:p-12 text-center text-white shadow-lg"
        >
          {/* Subtle glow layers */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/25 blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            <Sparkles className="h-10 w-10 text-yellow-300 animate-bounce mb-6" />
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl tracking-tight leading-tight">
              Sẵn sàng chinh phục mọi cơ hội phỏng vấn?
            </h2>
            <p className="mt-4 text-white/80 max-w-xl text-sm sm:text-base leading-relaxed">
              Bắt đầu tham gia luyện tập với AI hoặc tự tạo phiên phỏng vấn dựa trên kịch bản JD của bạn ngay hôm nay hoàn toàn miễn phí.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-blue-800 transition hover:bg-slate-50 active:scale-95 shadow-md"
              >
                Thử phỏng vấn ngay miễn phí
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/san-pham"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold hover:bg-white/20 transition"
              >
                Tìm hiểu thêm sản phẩm
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </main>
  );
}
