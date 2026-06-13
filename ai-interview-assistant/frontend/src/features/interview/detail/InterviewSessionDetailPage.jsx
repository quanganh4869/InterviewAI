import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, FileText, Loader2, Video } from "lucide-react";
import { Button, EmptyState, ProgressLine, SectionCard, StatusBadge } from "../../../components/ui";
import { createInterviewMediaObjectUrl, fetchInterviewReport } from "../../../api";
import "../../aiInterview/legacy.css";

function clampScore(value) {
  const number = Number(value || 0);
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(number) ? number : 0)));
}

function byQuestionId(items = []) {
  return items.reduce((acc, item) => {
    acc[item.question_id] = item;
    return acc;
  }, {});
}

function displayStatus(status) {
  const labels = {
    created: "Đã tạo",
    questions_generated: "Sẵn sàng phỏng vấn",
    in_progress: "Đang phỏng vấn",
    submitted: "Đã nộp",
    transcribing: "Đang chuyển giọng nói",
    evaluating: "Đang đánh giá",
    completed: "Hoàn tất",
    failed: "Thất bại",
    pending: "Đang chờ",
    processing: "Đang xử lý",
    skipped: "Bỏ qua",
    not_answered: "Chưa trả lời",
  };
  return labels[status] || status || "Chưa rõ";
}

function displaySessionType(type) {
  return type === "practice" ? "Luyện tập" : "Chính thức";
}

export default function InterviewSessionDetailPage() {
  const { sessionId: routeSessionId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = routeSessionId || searchParams.get("sessionId") || searchParams.get("id");
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [mediaUrls, setMediaUrls] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sessionId) {
        setError("Thieu sessionId.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const detail = await fetchInterviewReport({ sessionId });
        if (!cancelled) {
          setSession(detail);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể tải chi tiết phỏng vấn.");
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

  const evaluation = session?.evaluation;
  const answerMap = byQuestionId(session?.answers || []);

  return (
    <main className="interview-detail-page interview-legacy min-h-screen bg-[var(--color-bg)] px-4 py-6 text-[var(--color-text)] sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        {isLoading ? (
          <SectionCard>
            <p className="flex items-center gap-3 text-sm font-bold">
              <Loader2 className="h-5 w-5 animate-spin" /> Đang tải chi tiết phiên...
            </p>
          </SectionCard>
        ) : null}

        {!isLoading && error ? <EmptyState title="Không thể mở chi tiết" description={error} /> : null}

        {!isLoading && session ? (
          <>
            <header className="role-hero">
              <div className="role-hero-content">
                <div>
                  <StatusBadge status={session.status === "completed" ? "active" : "reviewing"}>{displayStatus(session.status)}</StatusBadge>
                  <h2>Chi tiết phiên phỏng vấn</h2>
                  <p>{session.job_posting?.title || session.practice_config?.target_role || "Phiên luyện tập"}</p>
                </div>
                <Button variant="ghost" onClick={() => navigate(-1)}>
                  <ArrowLeft size={16} /> Quay lại
                </Button>
              </div>
            </header>

            <section className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="grid gap-5">
                <SectionCard title="Điểm tổng">
                  <div className="grid place-items-center rounded-[22px] bg-[var(--color-primary-soft)] p-6 text-center">
                    <div className="text-5xl font-black text-[var(--color-primary)]">
                      {clampScore(evaluation?.overall_score)}
                    </div>
                    <p className="mt-2 text-sm font-bold text-[var(--color-text-muted)]">Điểm tổng</p>
                  </div>
                  <div className="mt-5 grid gap-4">
                    <ProgressLine label="Giao tiếp" value={clampScore(evaluation?.communication_score)} />
                    <ProgressLine label="Chuyên môn" value={clampScore(evaluation?.technical_score)} />
                    <ProgressLine label="Mức khớp JD" value={clampScore(evaluation?.jd_alignment_score)} />
                  </div>
                </SectionCard>

                <SectionCard title="Thông tin">
                  <Info icon={FileText} label="Loại phiên" value={displaySessionType(session.session_type)} />
                  <Info icon={BarChart3} label="Số câu hỏi" value={String(session.questions?.length || 0)} />
                  <Info icon={Video} label="Số câu trả lời" value={String(session.answers?.length || 0)} />
                </SectionCard>
              </aside>

              <section className="grid gap-5">
                <SectionCard title="Nhận xét tổng hợp">
                  <p className="text-sm leading-7 text-[var(--color-text)]">
                    {evaluation?.evaluation?.summary ||
                      evaluation?.evaluation?.hiring_recommendation ||
                      "Chưa có đánh giá tổng hợp."}
                  </p>
                </SectionCard>

                <SectionCard title="Bản ghi lời nói, video/audio và hỏi đáp">
                  <div className="grid gap-4">
                    {(session.questions || []).map((question, index) => {
                      const answer = answerMap[question.id];
                      const videoUrl = answer ? mediaUrls[`video-${answer.id}`] : "";
                      const audioUrl = answer ? mediaUrls[`audio-${answer.id}`] : "";
                      return (
                        <article key={question.id} className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <span className="text-xs font-black uppercase text-[var(--color-text-muted)]">Câu {index + 1}</span>
                              <h4 className="mt-1 text-sm font-extrabold leading-6">{question.question_text}</h4>
                            </div>
                            <StatusBadge status={answer?.transcription_status === "completed" ? "active" : "reviewing"}>
                              {displayStatus(answer?.transcription_status || "not_answered")}
                            </StatusBadge>
                          </div>
                          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                            <div className="grid gap-3">
                              {videoUrl ? (
                                <video src={videoUrl} controls className="aspect-video w-full rounded-[12px] bg-slate-950 object-cover" />
                              ) : audioUrl ? (
                                <audio src={audioUrl} controls className="w-full" />
                              ) : (
                                <div className="grid aspect-video place-items-center rounded-[12px] bg-slate-950 text-sm font-bold text-white/70">
                                  Không có media
                                </div>
                              )}
                            </div>
                            <div className="rounded-[12px] bg-[var(--color-surface)] p-3">
                              <div className="text-xs font-black uppercase text-[var(--color-text-muted)]">Bản ghi lời nói</div>
                              <p className="mt-2 whitespace-pre-line text-sm leading-6">
                                {answer?.transcript || answer?.transcription_error || "Bản ghi lời nói chưa sẵn sàng."}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </SectionCard>
              </section>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="mt-3 flex min-w-0 items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase text-[var(--color-text-muted)]">{label}</div>
        <div className="truncate font-bold">{value || "Chưa có"}</div>
      </div>
    </div>
  );
}
