import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  RefreshCcw,
  MessageSquareCode,
  ShieldAlert,
  Users,
  Compass,
} from "lucide-react";
import { Button, SectionCard, StatusBadge } from "../components/ui";
import { compareInterviewSessions } from "../api";
import "../features/aiInterview/legacy.css";

export default function InterviewComparisonPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdsStr = searchParams.get("sessionIds") || searchParams.get("ids");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState("technical");
  
  // Trạng thái bước tải dữ liệu giả lập
  const [loadStep, setLoadStep] = useState(1);

  const sessionIds = React.useMemo(() => {
    if (!sessionIdsStr) return [];
    return sessionIdsStr.split(",").map(Number).filter(Boolean);
  }, [sessionIdsStr]);

  const loadComparison = async () => {
    if (sessionIds.length < 2) {
      setError("Vui lòng chọn ít nhất 2 phiên phỏng vấn để so sánh.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    setLoadStep(1);

    // Hiệu ứng chuyển bước tải
    const stepInterval = setInterval(() => {
      setLoadStep((prev) => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 2500);

    try {
      const response = await compareInterviewSessions({ sessionIds });
      setResult(response);
    } catch (err) {
      setError(err?.message || "Không thể tải báo cáo so sánh phiên phỏng vấn.");
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [sessionIdsStr]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center p-6 text-[var(--color-text)]">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="relative flex justify-center items-center">
            <div className="absolute animate-ping h-16 w-16 rounded-full bg-blue-500/20" />
            <div className="relative h-14 w-14 rounded-full bg-blue-600 flex justify-center items-center text-white">
              <Brain className="h-7 w-7 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-extrabold">Đang so sánh hội thoại</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Mô hình Gemini AI đang xử lý transcript và chấm điểm đối chiếu...
            </p>
          </div>

          <div className="border-t border-[var(--color-border)] pt-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <span className={`h-6 w-6 rounded-full flex justify-center items-center text-xs font-black ${
                loadStep >= 1 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {loadStep > 1 ? "✓" : "1"}
              </span>
              <span className={`text-sm ${loadStep >= 1 ? "font-bold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                Thu thập dữ liệu các cuộc hội thoại
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-6 w-6 rounded-full flex justify-center items-center text-xs font-black ${
                loadStep >= 2 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {loadStep > 2 ? "✓" : "2"}
              </span>
              <span className={`text-sm ${loadStep >= 2 ? "font-bold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                Đối chiếu câu trả lời và năng lực thâm niên
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-6 w-6 rounded-full flex justify-center items-center text-xs font-black ${
                loadStep >= 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {loadStep === 3 ? "●" : "3"}
              </span>
              <span className={`text-sm ${loadStep >= 3 ? "font-bold text-[var(--color-text)] animate-pulse" : "text-[var(--color-text-muted)]"}`}>
                Tổng hợp báo cáo so sánh từ Gemini
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center p-6 text-[var(--color-text)]">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-rose-200 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-rose-50 border border-rose-200 mx-auto flex justify-center items-center text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-rose-800">Không thể thực hiện so sánh</h3>
            <p className="text-sm text-rose-700/80 leading-relaxed">{error}</p>
          </div>
          <div className="pt-2 flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate("/dashboard?screen=insights")}>
              Quay lại Dashboard
            </Button>
            <Button variant="primary" onClick={loadComparison}>
              Thử lại
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!result) return null;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Purple Premium Glassmorphic Header */}
        <header className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge status="active">Gemini AI Comparison</StatusBadge>
                <span className="text-xs font-semibold text-slate-400">Model: {result.provider || "gemini-2.5-flash"}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <Users className="h-6 w-6 text-indigo-400" /> Báo cáo so sánh cuộc trò chuyện
              </h2>
              <p className="text-sm font-semibold text-slate-400">
                Đối chiếu năng lực và chấm điểm các phiên phỏng vấn song song
              </p>
            </div>
            
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate-300 hover:text-white border border-slate-700 bg-slate-800/50 hover:bg-slate-800">
              <ArrowLeft size={16} className="mr-1.5" /> Quay lại
            </Button>
          </div>
        </header>

        {/* Executive summary block */}
        <SectionCard title="Tóm tắt so sánh tổng quan" icon={<Sparkles className="h-5 w-5 text-indigo-500" />}>
          <p className="text-sm leading-8 text-[var(--color-text-muted)] whitespace-pre-line font-medium">
            {result.comparison_summary}
          </p>
        </SectionCard>

        {/* Candidates Grid - Side-by-Side */}
        <section className="grid gap-6 md:grid-cols-2">
          {result.candidates?.map((candidate, idx) => {
            const colors = idx === 0 
              ? { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-600", fill: "stroke-blue-600" } 
              : { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-600", fill: "stroke-purple-600" };
            
            return (
              <div key={candidate.session_id} className={`rounded-3xl border ${colors.border} bg-[var(--color-surface)] p-6 shadow-md hover:shadow-lg transition-all space-y-6`}>
                
                {/* Header identity */}
                <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
                  <div className={`h-12 w-12 rounded-2xl ${colors.bg} flex justify-center items-center text-lg font-black ${colors.text}`}>
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">{candidate.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">Phiên phỏng vấn ID: #{candidate.session_id}</p>
                  </div>
                </div>

                {/* Grid of Scores */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: "Tổng điểm", val: candidate.overall_score },
                    { label: "Kỹ năng chuyên môn", val: candidate.technical_score },
                    { label: "Kỹ năng giao tiếp", val: candidate.communication_score },
                    { label: "Độ phù hợp JD", val: candidate.jd_alignment_score },
                  ].map((score, sIdx) => (
                    <div key={sIdx} className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-3 rounded-2xl">
                      <div className="text-2xl font-black text-[var(--color-text)]">{Math.round(score.val)}%</div>
                      <div className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] mt-1">{score.label}</div>
                    </div>
                  ))}
                </div>

                {/* Qualities */}
                <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Điểm mạnh nổi bật
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-[var(--color-text-muted)] font-semibold space-y-1.5">
                      {candidate.strengths?.map((str, strIdx) => (
                        <li key={strIdx}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Điểm cần cải thiện
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-[var(--color-text-muted)] font-semibold space-y-1.5">
                      {candidate.weaknesses?.map((weak, weakIdx) => (
                        <li key={weakIdx}>{weak}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* JD Fit Analysis */}
                <div className="rounded-2xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-4 text-sm leading-6 text-[var(--color-text-muted)] font-medium">
                  <strong>Phân tích sự phù hợp công việc:</strong>
                  <p className="mt-1">{candidate.jd_fit_analysis}</p>
                </div>

              </div>
            );
          })}
        </section>

        {/* Matrix Comparison Tabs */}
        {result.comparison_matrix && (
          <SectionCard title="Ma trận so khớp năng lực chi tiết">
            <div className="space-y-5">
              {/* Tab selector */}
              <div className="flex border-b border-[var(--color-border)] pb-1 overflow-x-auto gap-2">
                {[
                  { id: "technical", label: "Kiến thức & Chuyên môn", icon: MessageSquareCode },
                  { id: "communication", label: "Kỹ năng truyền đạt", icon: Award },
                  { id: "problem_solving", label: "Tư duy giải quyết vấn đề", icon: Compass },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeMatrixTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveMatrixTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                        isActive
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="rounded-2xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] p-5 leading-7 text-[var(--color-text-muted)] text-sm font-semibold">
                {activeMatrixTab === "technical" && (
                  <p className="whitespace-pre-line">{result.comparison_matrix.technical_depth}</p>
                )}
                {activeMatrixTab === "communication" && (
                  <p className="whitespace-pre-line">{result.comparison_matrix.communication}</p>
                )}
                {activeMatrixTab === "problem_solving" && (
                  <p className="whitespace-pre-line">{result.comparison_matrix.problem_solving}</p>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Recruiter recommendation final verdict */}
        <section className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 text-indigo-500/5 transform translate-x-10 translate-y-10">
            <Bot className="h-64 w-64" />
          </div>
          <div className="relative space-y-3">
            <h3 className="text-base font-extrabold text-[var(--color-text)] flex items-center gap-2">
              <Award className="h-6 w-6 text-indigo-500" /> Khuyến nghị tuyển dụng cuối cùng
            </h3>
            <p className="text-sm leading-8 text-[var(--color-text-muted)] whitespace-pre-line font-medium">
              {result.final_verdict}
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
