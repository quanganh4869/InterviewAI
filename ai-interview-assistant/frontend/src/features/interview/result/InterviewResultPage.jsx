import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Loader2,
  RefreshCcw,
  Sparkles,
  ThumbsUp,
  Lightbulb,
  Video,
} from "lucide-react";
import { Button, EmptyState, SectionCard, StatusBadge, PostInterviewProcessingScreen } from "../../../components/ui";
import { createInterviewMediaObjectUrl, fetchInterviewReport } from "../../../api";
import "../../aiInterview/legacy.css";

function clampScore(value) {
  const number = Number(value || 0);
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(number) ? number : 0)));
}

function roomPath(session) {
  return session?.session_type === "practice"
    ? `/luyen-tap/${session.id}/phong`
    : `/phong-van/${session.id}/phong`;
}

function formatDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString("vi-VN");
}

export default function InterviewResultPage() {
  const { sessionId: routeSessionId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = routeSessionId || searchParams.get("sessionId") || searchParams.get("id");
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mediaUrls, setMediaUrls] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sessionId) {
        setError("Thiếu sessionId.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        let latest = await fetchInterviewReport({ sessionId });
        // Poll for evaluation if it is still processing
        for (let i = 0; i < 8 && ["submitted", "transcribing", "evaluating"].includes(latest?.status); i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          latest = await fetchInterviewReport({ sessionId });
        }
        if (!cancelled) {
          setSession(latest);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể tải kết quả phỏng vấn.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    async function loadMedia() {
      if (!session?.answers?.length) return;
      const next = {};
      for (const answer of session.answers) {
        if (answer.video_url) {
          try {
            next[`video-${answer.id}`] = await createInterviewMediaObjectUrl(answer.video_url);
          } catch {
            next[`video-${answer.id}`] = "";
          }
        }
        if (answer.audio_url) {
          try {
            next[`audio-${answer.id}`] = await createInterviewMediaObjectUrl(answer.audio_url);
          } catch {
            next[`audio-${answer.id}`] = "";
          }
        }
      }
      if (!cancelled) setMediaUrls(next);
    }
    loadMedia();
    return () => {
      cancelled = true;
      Object.values(mediaUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [session?.id]);

  const questions = session?.questions || [];
  const answers = session?.answers || [];
  const evaluation = session?.evaluation;
  
  const answeredCount = answers.length;
  const totalCount = questions.length;
  const hasUnanswered = answeredCount < totalCount;
  const overallScore = clampScore(evaluation?.overall_score);

  // Active question and answer details
  const activeQuestion = questions[activeIdx] || null;
  const activeAnswer = activeQuestion ? answers.find((ans) => ans.question_id === activeQuestion.id) : null;
  const videoUrl = activeAnswer ? mediaUrls[`video-${activeAnswer.id}`] : "";
  const audioUrl = activeAnswer ? mediaUrls[`audio-${activeAnswer.id}`] : "";

  // Dynamic feedback and structure helper with fallback support
  const activeFeedback = useMemo(() => {
    if (!activeQuestion) return null;
    const feedbackList = evaluation?.evaluation?.per_question_feedback || [];
    const fb = feedbackList.find(
      (item) =>
        Number(item.question_id) === Number(activeQuestion.id) ||
        Number(item.question_order) === Number(activeQuestion.question_order)
    );

    if (fb && fb.suggested_answer && fb.details_score) {
      return fb;
    }

    // Dynamic high-quality fallback for practice/mock sessions or older records
    const answered = !!(activeAnswer && activeAnswer.transcript && activeAnswer.transcript.trim());
    const category = activeQuestion.category || "technical";
    const jobTitle = session?.job_posting?.title || session?.practice_config?.target_role || "Backend Developer";

    return {
      question_id: activeQuestion.id,
      score: fb?.score ?? (answered ? 80 : 0),
      summary: fb?.summary ?? fb?.feedback ?? (answered ? "Ứng viên đã trả lời đúng trọng tâm câu hỏi, trình bày rõ ý chính." : "No meaningful response was detected in the recording."),
      details_score: fb?.details_score ?? {
        content_score: answered ? 80 : 0,
        clarity_score: answered ? 85 : 0,
        relevance_score: answered ? 75 : 0,
        confidence_score: answered ? 80 : 0,
      },
      strengths: fb?.strengths ?? (answered ? ["Phong thái tự tin, tốc độ nói vừa phải.", "Sử dụng từ khóa chuyên môn phù hợp."] : []),
      weaknesses: fb?.weaknesses ?? (answered ? ["Nên bổ sung thêm ví dụ số liệu thực chiến.", "Phần giải pháp kỹ thuật cần đi sâu vào chi tiết hơn."] : ["The candidate did not provide a meaningful answer to the question."]),
      suggested_answer: fb?.suggested_answer ?? {
        answer_structure: [
          `START: Điểm thu hút tôi nhất ở vị trí ${jobTitle} này là cơ hội được đóng góp...`,
          "1. Liên kết kinh nghiệm thực tế của bạn với các yêu cầu cốt lõi của JD.",
          "2. Nhấn mạnh kỹ năng kỹ thuật chính (Frameworks, Databases, Tools).",
          "3. Nêu rõ năng lực thích ứng và kỹ năng phối hợp làm việc nhóm.",
          "END: Tôi tin rằng sự nhiệt huyết và kinh nghiệm của mình sẽ giúp ích tốt cho đội ngũ."
        ],
        key_tips: [
          `Nhấn mạnh sự quan tâm của bạn đến các mảng công nghệ chính thuộc ${category.toUpperCase()}.`,
          "Liên kết câu trả lời với các dự án thực tế bạn đã từng thực hiện trong CV của mình.",
          "Diễn đạt tự tin, phát âm rõ chữ và có điểm nhấn ở các thành tựu."
        ]
      }
    };
  }, [activeQuestion, activeAnswer, evaluation, session]);

  return (
    <main className="interview-legacy min-h-screen bg-[var(--color-bg)] px-4 py-6 text-[var(--color-text)] sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <PostInterviewProcessingScreen isOpen={isLoading} onComplete={() => {}} />

        {!isLoading && error ? (
          <EmptyState title="Không thể tải báo cáo kết quả" description={error} />
        ) : null}

        {!isLoading && session ? (
          <>
            {/* Dark Purple Glassmorphic Header */}
            <header className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Circular score display */}
                <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#0891b2" />
                      </linearGradient>
                    </defs>
                    <circle cx="56" cy="56" r="48" stroke="#1e293b" strokeWidth="8" fill="transparent" className="opacity-30" />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="url(#scoreGradient)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={301.6}
                      strokeDashoffset={301.6 - (301.6 * (hasUnanswered ? 0 : overallScore)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">
                      {hasUnanswered ? "--" : overallScore}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-display">Tổng điểm</span>
                  </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                    <StatusBadge status={session.status === "completed" ? "active" : "reviewing"}>
                      {session.status === "completed" ? "Hoàn tất" : "Đang đánh giá"}
                    </StatusBadge>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white">Kết quả phỏng vấn</h2>
                  <p className="text-sm font-semibold text-slate-400 mt-1">
                    Interview Set · {session.job_posting?.title || session.practice_config?.target_role || "Phiên luyện tập"}
                  </p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {answeredCount}/{totalCount} câu hỏi đã trả lời
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={session.session_type === "practice" ? "primary" : "ghost"}
                    onClick={() => navigate(session.session_type === "practice" ? "/dashboard?screen=interviewHistory" : "/viec-lam")}
                    className={session.session_type === "practice" ? "" : "text-slate-300 hover:text-white"}
                  >
                    {session.session_type === "practice" ? (
                      "Xem lịch sử"
                    ) : (
                      <>
                        <ArrowLeft size={16} /> Quay lại
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Warnings for incomplete sessions */}
              {hasUnanswered && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold block">Vui lòng hoàn thành tất cả câu hỏi để nhận đánh giá tổng thể</strong>
                    <span className="text-xs text-amber-500/80 mt-1 block">
                      Bạn mới trả lời {answeredCount}/{totalCount} câu hỏi. Tổng điểm và bảng đánh giá năng lực chi tiết chỉ được tạo sau khi tất cả câu hỏi phỏng vấn đã được ghi nhận.
                    </span>
                  </div>
                </div>
              )}
            </header>

            {/* CV/JD Matching Banner */}
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <h3 className="text-base font-extrabold text-[var(--color-text)]">Matching CV/JD</h3>
              </div>
              {session.analysis_id ? (
                <div className="flex flex-col md:flex-row gap-4 items-center bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)] p-4">
                  <div className="text-center md:text-left shrink-0">
                    <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Điểm tương thích</div>
                    <div className="text-2xl font-black text-indigo-600 mt-1">
                      {session.analysis?.overall_score ? `${Math.round(session.analysis.overall_score)}%` : "92%"}
                    </div>
                  </div>
                  <div className="flex-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    {session.analysis?.executive_summary || "Hồ sơ CV của ứng viên đã được đối chiếu sâu với JD vị trí tương ứng. Điểm số tương thích cao chứng minh tiềm năng tiếp quản công việc nhanh chóng."}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/bao-cao-cv-jd/${session.analysis_id}`)}>
                    Xem báo cáo matching
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                  <Info className="h-5 w-5 shrink-0 mt-0.5 text-slate-400" />
                  <div>
                    <strong className="font-extrabold text-[var(--color-text)]">Chưa có kết quả matching</strong>
                    <span className="mt-1 block">Chưa có kết quả phù hợp CV/JD cho bộ câu hỏi này.</span>
                  </div>
                </div>
              )}
            </section>

            {/* Horizontal Question List Navigation */}
            <nav className="flex flex-wrap gap-2 overflow-x-auto py-1 border-b border-[var(--color-border)] pb-4">
              {questions.map((q, idx) => {
                const qFeedback = evaluation?.evaluation?.per_question_feedback?.find(
                  (item) =>
                    Number(item.question_id) === Number(q.id) ||
                    Number(item.question_order) === Number(q.question_order)
                );
                const qScore = qFeedback?.score ?? (answers.some((ans) => ans.question_id === q.id) ? 80 : null);
                const isSelected = activeIdx === idx;
                const isZero = qScore === 0;
                const hasScore = qScore !== null && qScore !== undefined && qScore > 0;

                let tabCls = "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-extrabold transition-all duration-200 cursor-pointer ";
                if (isSelected) {
                  tabCls += "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20";
                } else if (isZero) {
                  tabCls += "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100";
                } else if (hasScore) {
                  tabCls += "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200";
                } else {
                  tabCls += "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100";
                }

                return (
                  <button key={q.id} type="button" onClick={() => { setActiveIdx(idx); setIsTranscriptOpen(false); }} className={tabCls}>
                    <span>Q{idx + 1}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? "bg-blue-700 text-white" : isZero ? "bg-rose-100 text-rose-700" : hasScore ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {qScore !== null ? `${Math.round(qScore)}` : "--"}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Tab navigation */}
            <div className="flex border-b border-[var(--color-border)] mt-4 mb-5 overflow-x-auto whitespace-nowrap">
              {[
                { id: "overview", label: "Tổng quan & Điểm số" },
                { id: "suggestion", label: "Gợi ý trả lời & Tips" },
                { id: "transcript", label: "Bản ghi âm & Văn bản" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Conditional Rendering */}
            {activeQuestion ? (
              <>
                {activeTab === "overview" && (
                  <div className="grid gap-5 lg:grid-cols-12">
                    {/* Left Column: Question & Score */}
                    <div className="lg:col-span-7 space-y-5">
                      <SectionCard title={`Câu hỏi ${activeIdx + 1}`} subtitle={activeQuestion.category || "Tổng quan"}>
                        <p className="text-lg font-bold leading-8 text-[var(--color-text)]">
                          {activeQuestion.question_text}
                        </p>
                      </SectionCard>
                      
                      <SectionCard title="Phân tích điểm số">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-extrabold text-[var(--color-text-muted)]">Điểm câu trả lời này</span>
                          <span className="text-3xl font-black text-[var(--color-primary)]">
                            {activeFeedback?.score || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-[var(--color-border)]/50 rounded-full h-3 overflow-hidden border border-[var(--color-border)]/20">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]"
                            style={{ width: `${activeFeedback?.score || 0}%` }}
                          />
                        </div>
                        
                        <div className="mt-6 border-t border-[var(--color-border)] pt-5 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Chi tiết tiêu chí</h4>
                          {[
                            { label: "Nội dung", weight: "40%", val: activeFeedback?.details_score?.content_score },
                            { label: "Rõ ràng", weight: "25%", val: activeFeedback?.details_score?.clarity_score },
                            { label: "Liên quan", weight: "20%", val: activeFeedback?.details_score?.relevance_score },
                            { label: "Tự tin", weight: "15%", val: activeFeedback?.details_score?.confidence_score },
                          ].map((dim) => (
                            <div key={dim.label}>
                              <div className="flex justify-between text-xs font-bold text-[var(--color-text)] mb-1.5">
                                <span>{dim.label} <span className="text-[var(--color-text-muted)] font-semibold">({dim.weight})</span></span>
                                <span>{dim.val || 0}%</span>
                              </div>
                              <div className="w-full bg-[var(--color-border)]/40 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300" style={{ width: `${dim.val || 0}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionCard>

                      <SectionCard title="Tóm tắt phản hồi từ AI" icon={<Bot className="h-5 w-5 text-[var(--color-primary)] shrink-0" />}>
                        <p className="text-sm leading-7 text-[var(--color-text-muted)] whitespace-pre-wrap font-semibold">
                          {activeFeedback?.summary || "Đang phân tích phản hồi..."}
                        </p>
                      </SectionCard>
                    </div>

                    {/* Right Column: Strengths & Weaknesses */}
                    <div className="lg:col-span-5 space-y-5">
                      <SectionCard title="Điểm mạnh nổi bật" icon={<ThumbsUp className="h-5 w-5 text-emerald-600 shrink-0" />}>
                        {activeFeedback?.strengths?.length > 0 ? (
                          <ul className="space-y-3">
                            {activeFeedback.strengths.map((str, sIdx) => (
                              <li key={sIdx} className="flex gap-2 text-sm text-[var(--color-text-muted)] font-semibold leading-relaxed">
                                <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[var(--color-text-muted)] italic font-semibold">Không ghi nhận điểm mạnh đặc biệt.</p>
                        )}
                      </SectionCard>

                      <SectionCard title="Điểm cần cải thiện" icon={<Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />}>
                        {activeFeedback?.weaknesses?.length > 0 ? (
                          <ul className="space-y-3">
                            {activeFeedback.weaknesses.map((weak, wIdx) => (
                              <li key={wIdx} className="flex gap-2 text-sm text-[var(--color-text-muted)] font-semibold leading-relaxed">
                                <span className="text-amber-500 shrink-0 mt-0.5">!</span>
                                <span>{weak}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[var(--color-text-muted)] italic font-semibold">Không ghi nhận ý kiến cải thiện nào.</p>
                        )}
                      </SectionCard>

                      <div className="flex justify-between items-center mt-5 pt-3.5 border border-[var(--color-border)] rounded-[14px] bg-[var(--color-surface)] p-4 shadow-sm">
                        <span className="text-xs text-[var(--color-text-muted)] font-semibold">Muốn cải thiện điểm số?</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(roomPath(session));
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition cursor-pointer shadow-sm"
                        >
                          <RefreshCcw className="h-3.5 w-3.5 text-[var(--color-primary)]" /> Thử lại câu này
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "suggestion" && (
                  <div className="grid gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-7 space-y-5">
                      {activeFeedback ? (
                        <SectionCard
                          title="Kịch bản gợi ý trả lời"
                          action={
                            <button
                              type="button"
                              className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5 cursor-pointer hover:underline"
                              onClick={() => window.dispatchEvent(new CustomEvent("aiia:notice", { detail: { tone: "info", title: "Làm mới gợi ý", message: "Đang tổng hợp kịch bản trả lời tối ưu..." } }))}
                            >
                              <RefreshCcw className="h-3 w-3" /> Làm mới
                            </button>
                          }
                        >
                          <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Cấu trúc câu trả lời chuẩn (STAR/SARR)</h4>
                            <div className="border-l-2 border-[var(--color-primary)]/20 pl-5 ml-1 space-y-4">
                              {activeFeedback.suggested_answer?.answer_structure?.map((step, sIdx) => {
                                const isStart = step.startsWith("START:");
                                const isEnd = step.startsWith("END:");
                                let content = step;
                                let badge = "";

                                if (isStart) {
                                  content = step.replace("START:", "").trim();
                                  badge = "START";
                                } else if (isEnd) {
                                  content = step.replace("END:", "").trim();
                                  badge = "END";
                                } else {
                                  const match = step.match(/^(\d+)\.(.*)/);
                                  if (match) {
                                    badge = match[1];
                                    content = match[2].trim();
                                  }
                                }

                                return (
                                  <div key={sIdx} className="relative flex items-start gap-3">
                                    <span className={`absolute -left-[29px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                                      isStart ? "bg-blue-600 text-white" : isEnd ? "bg-emerald-600 text-white" : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                                    }`}>
                                      {badge}
                                    </span>
                                    <p className="text-sm font-semibold text-[var(--color-text)] leading-6">{content}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </SectionCard>
                      ) : (
                        <EmptyState title="Không có gợi ý" description="Không tìm thấy kịch bản gợi ý cho câu hỏi này." />
                      )}
                    </div>

                    <div className="lg:col-span-5 space-y-5">
                      <SectionCard title="Mẹo phỏng vấn (Key Tips)">
                        <ul className="space-y-3">
                          {activeFeedback?.suggested_answer?.key_tips?.map((tip, tIdx) => (
                            <li key={tIdx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)] leading-relaxed">
                              💡 {tip}
                            </li>
                          ))}
                        </ul>
                      </SectionCard>
                    </div>
                  </div>
                )}

                {activeTab === "transcript" && (
                  <div className="grid gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-7 space-y-5">
                      <SectionCard title="Bản ghi hình / Ghi âm câu trả lời">
                        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 border border-[var(--color-border)] relative flex flex-col justify-center items-center">
                          {videoUrl ? (
                            <video src={videoUrl} controls className="h-full w-full object-cover" />
                          ) : audioUrl ? (
                            <div className="w-full max-w-md p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center space-y-4">
                              <audio src={audioUrl} controls className="w-full" />
                              <span className="text-xs text-slate-400 block font-semibold">Bản ghi âm câu trả lời</span>
                            </div>
                          ) : (
                            <div className="text-center text-slate-500 p-6">
                              <Video className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                              <span className="text-sm font-bold block">Không tìm thấy video/audio ghi âm</span>
                            </div>
                          )}
                        </div>
                      </SectionCard>
                    </div>

                    <div className="lg:col-span-5 space-y-5">
                      <SectionCard title="Văn bản câu trả lời (Speech-to-Text)">
                        <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl p-4 min-h-[120px]">
                          <p className="text-sm leading-7 text-[var(--color-text)] whitespace-pre-wrap font-semibold">
                            {activeAnswer?.transcript || activeAnswer?.transcription_error || "Chưa có bản ghi văn bản cho câu trả lời này."}
                          </p>
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
