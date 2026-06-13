import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, FileText, Loader2, MapPin, Play, Upload } from "lucide-react";
import { MainLayout } from "../../components/layout";
import { Button, EmptyState, SectionCard, Skeleton, StatusBadge } from "../../components/ui";
import {
  analyzeCvJd,
  createInterviewSession,
  fetchCvJdAnalysisDetail,
  fetchCvJdAnalysisHistory,
  fetchJobPostingDetail,
  fetchMyDocuments,
  fetchMyInterviewSessions,
  fetchPublicJobPostings,
  uploadCvDocument,
} from "../../api";
import "../aiInterview/legacy.css";

function field(value, fallback = "Chưa cập nhật") {
  return value ? String(value) : fallback;
}

function jobText(job) {
  return [job?.description, job?.requirements, job?.benefits].filter(Boolean).join("\n\n");
}

function excerpt(job) {
  const text = jobText(job).replace(/\s+/g, " ").trim();
  return text.length > 220 ? `${text.slice(0, 220)}...` : text || "JD chưa có mô tả ngắn.";
}

function PageShell({ children }) {
  return (
    <MainLayout>
      <div className="interview-legacy animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </MainLayout>
  );
}

function JobSkeleton() {
  return (
    <div className="grid gap-3">
      {[1, 2, 3].map((item) => (
        <SectionCard key={item}>
          <div className="grid gap-3">
            <Skeleton height={18} width="45%" />
            <Skeleton height={14} width="70%" />
            <Skeleton height={54} width="100%" />
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

export function CandidateJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const page = await fetchPublicJobPostings();
        if (!cancelled) {
          setJobs(page?.items || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể tải danh sách việc làm.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <div className="grid gap-5">
        <header className="role-hero">
          <div className="role-hero-content">
            <div>
              <StatusBadge status="active">JD đã đăng</StatusBadge>
              <h2>Việc làm đang tuyển</h2>
              <p>Chọn một JD để xem chi tiết và đối chiếu CV.</p>
            </div>
          </div>
        </header>

        {isLoading ? <JobSkeleton /> : null}
        {!isLoading && error ? <EmptyState title="Không thể tải việc làm" description={error} /> : null}
        {!isLoading && !error && !jobs.length ? (
          <EmptyState title="Chưa có JD nào được đăng" description="HR có thể đăng JD từ thư viện tài liệu." />
        ) : null}

        {!isLoading && !error && jobs.length ? (
          <section className="grid gap-3">
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => navigate(`/viec-lam/${job.id}`)}
                className="section-card w-full text-left transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-[var(--color-text)]">{job.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
                      {field(job.company, "Công ty")} · {field(job.level, "Level chưa rõ")}
                    </p>
                  </div>
                  <StatusBadge status="active">{field(job.status, "published")}</StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--color-text-muted)]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1">
                    <MapPin size={14} /> {field(job.location)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1">
                    <BriefcaseBusiness size={14} /> {field(job.work_type)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1">
                    <CalendarDays size={14} /> {field(job.deadline)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-muted)]">{excerpt(job)}</p>
              </button>
            ))}
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

export function CandidateJobDetailPage() {
  const navigate = useNavigate();
  const { jobPostingId } = useParams();
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [existingAnalysisId, setExistingAnalysisId] = useState(null);
  const [existingCvId, setExistingCvId] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [isStartingOfficial, setIsStartingOfficial] = useState(false);
  const [isStartingPractice, setIsStartingPractice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [detail, historyData, sessionsData, docsData] = await Promise.all([
          fetchJobPostingDetail({ postingId: jobPostingId }),
          fetchCvJdAnalysisHistory({ page: 1, pageSize: 50 }).catch(() => null),
          fetchMyInterviewSessions().catch(() => null),
          fetchMyDocuments({ documentType: "cv" }).catch(() => null),
        ]);
        if (!cancelled) {
          setJob(detail);
          const match = (historyData?.items || historyData || []).find(
            (h) => String(h.job_posting_id) === String(jobPostingId)
          );
          if (match) {
            setExistingAnalysisId(match.id);
            setExistingCvId(match.cv_document_id);
          }
          setMySessions(sessionsData?.items || sessionsData || []);
          setCvs(docsData?.items || docsData || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể tải chi tiết JD.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [jobPostingId]);

  const hasCompletedOfficial = useMemo(() => {
    const activeSessionStatuses = ["created", "questions_generated", "in_progress", "transcribing"];
    return mySessions.some(
      (s) =>
        s.session_type === "official" &&
        String(s.job_posting_id) === String(jobPostingId) &&
        !activeSessionStatuses.includes(s.status)
    );
  }, [mySessions, jobPostingId]);

  const startOfficialInterview = async () => {
    if (!existingAnalysisId) return;
    setIsStartingOfficial(true);
    try {
      const session = await createInterviewSession({ sessionType: "official", analysisId: existingAnalysisId });
      navigate(`/phong-van/${session.id}/phong`);
    } catch (err) {
      setError(err?.message || "Không thể tạo phòng phỏng vấn chính thức.");
    } finally {
      setIsStartingOfficial(false);
    }
  };

  const startPracticeInterview = async () => {
    if (!job) return;
    setIsStartingPractice(true);
    try {
      const session = await createInterviewSession({
        sessionType: "practice",
        jobPostingId: job.id,
        cvDocumentId: existingCvId || cvs[0]?.id || null,
        practiceConfig: {
          target_role: job.title || "Target Role",
          focus: "General interview",
          level: job.level || "General",
          language: "vi",
        },
      });
      navigate(`/luyen-tap/${session.id}/phong`);
    } catch (err) {
      setError(err?.message || "Không thể tạo phòng luyện tập.");
    } finally {
      setIsStartingPractice(false);
    }
  };

  return (
    <PageShell>
      <div className="grid gap-5">
        <Button variant="ghost" onClick={() => navigate("/viec-lam")} className="w-fit">
          <ArrowLeft size={16} /> Danh sách việc làm
        </Button>
        {isLoading ? <JobSkeleton /> : null}
        {!isLoading && error ? <EmptyState title="Không thể mở JD" description={error} /> : null}
        {!isLoading && hasCompletedOfficial && (
          <div className="rounded-[12px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500 font-semibold">
            Bạn đã thực hiện phỏng vấn chính thức cho vị trí này với CV đã đối chiếu. Kết quả đã được gửi cho bộ phận HR để xem xét.
          </div>
        )}
        {!isLoading && job ? (
          <>
            <header className="role-hero">
              <div className="role-hero-content">
                <div>
                  <StatusBadge status="active">{field(job.status, "published")}</StatusBadge>
                  <h2>{job.title}</h2>
                  <p>{field(job.company, "Công ty")} · {field(job.location)}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={startPracticeInterview} isLoading={isStartingPractice} variant="outline" className="shadow-md">
                    <Play size={16} /> Luyện tập tự do
                  </Button>
                  {existingAnalysisId ? (
                    <>
                      <Button
                        onClick={startOfficialInterview}
                        isLoading={isStartingOfficial}
                        disabled={hasCompletedOfficial}
                        variant="primary"
                        className="shadow-md"
                      >
                        <Play size={16} /> Vào phỏng vấn thật
                      </Button>
                      <Button onClick={() => navigate(`/viec-lam/${job.id}/so-sanh-cv`)} variant="outline">
                        <FileText size={16} /> So sánh lại CV
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => navigate(`/viec-lam/${job.id}/so-sanh-cv`)}>
                      <FileText size={16} /> So sánh CV với JD
                    </Button>
                  )}
                </div>
              </div>
            </header>
            <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <SectionCard title="Tổng quan">
                <div className="grid gap-3 text-sm">
                  {[
                    ["Công ty", job.company],
                    ["Địa điểm", job.location],
                    ["Lương", job.salary],
                    ["Hình thức", job.work_type],
                    ["Kinh nghiệm", job.experience],
                    ["Cấp bậc", job.level],
                    ["Hạn nộp", job.deadline],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
                      <div className="text-xs font-black uppercase text-[var(--color-text-muted)]">{label}</div>
                      <div className="mt-1 font-bold text-[var(--color-text)]">{field(value)}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <div className="grid gap-4">
                <SectionCard title="Mô tả công việc">
                  <p className="whitespace-pre-line text-sm leading-7 text-[var(--color-text)]">{field(job.description, "Chưa có mô tả.")}</p>
                </SectionCard>
                <SectionCard title="Yêu cầu">
                  <p className="whitespace-pre-line text-sm leading-7 text-[var(--color-text)]">{field(job.requirements, "Chưa có yêu cầu.")}</p>
                </SectionCard>
                <SectionCard title="Quyền lợi">
                  <p className="whitespace-pre-line text-sm leading-7 text-[var(--color-text)]">{field(job.benefits, "Chưa có quyền lợi.")}</p>
                </SectionCard>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

export function CandidateJobComparePage() {
  const navigate = useNavigate();
  const { jobPostingId } = useParams();
  const [job, setJob] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // Custom loading state variables
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [step1Status, setStep1Status] = useState("active");
  const [step1Subtitle, setStep1Subtitle] = useState("Đang tải dữ liệu...");
  const [step2Status, setStep2Status] = useState("pending");
  const [step2Subtitle, setStep2Subtitle] = useState("Đang chờ...");
  const [step3Status, setStep3Status] = useState("pending");
  const [step3Subtitle, setStep3Subtitle] = useState("Đang chờ...");

  const selectedCv = useMemo(
    () => cvs.find((item) => String(item.id) === String(selectedCvId)),
    [cvs, selectedCvId],
  );

  async function loadData() {
    setIsLoading(true);
    try {
      const [detail, docs] = await Promise.all([
        fetchJobPostingDetail({ postingId: jobPostingId }),
        fetchMyDocuments({ documentType: "cv" }),
      ]);
      const rows = docs?.items || docs || [];
      setJob(detail);
      setCvs(rows);
      setSelectedCvId((current) => current || rows[0]?.id || "");
      setError("");
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu so sánh.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [jobPostingId]);

  const uploadSelectedFile = async () => {
    if (!file) return null;
    setIsUploading(true);
    try {
      const uploaded = await uploadCvDocument({ file, targetRole: job?.title || "" });
      await loadData();
      setSelectedCvId(uploaded?.id || uploaded?.document_id || "");
      return uploaded?.id || uploaded?.document_id;
    } finally {
      setIsUploading(false);
    }
  };

  const analyze = async () => {
    setError("");
    setLoadingProgress(10);
    setStep1Status("active");
    setStep1Subtitle(file ? "Đang tải lên tệp tin CV PDF..." : "Đang kiểm tra thông tin CV...");
    setStep2Status("pending");
    setStep2Subtitle("Đang chờ...");
    setStep3Status("pending");
    setStep3Subtitle("Đang chờ...");

    setIsAnalyzing(true);
    let progressTimer = null;

    try {
      let cvId = selectedCvId;
      if (file) {
        setIsUploading(true);
        const uploadedId = await uploadSelectedFile();
        cvId = uploadedId;
        setIsUploading(false);
      }

      setStep1Status("done");
      setStep1Subtitle(file ? "Đã tải lên CV thành công" : "Đã chọn CV thành công");
      setStep2Status("active");
      setStep2Subtitle("Đang đọc nội dung & trích xuất văn bản...");
      setLoadingProgress(40);

      if (!cvId) throw new Error("Vui lòng chọn hoặc tải lên CV PDF.");

      let currentProgress = 40;
      progressTimer = setInterval(() => {
        currentProgress = Math.min(currentProgress + Math.floor(Math.random() * 3) + 1, 95);
        setLoadingProgress(currentProgress);
        if (currentProgress > 65 && currentProgress <= 80) {
          setStep2Status("done");
          setStep2Subtitle("Trích xuất nội dung hoàn tất");
          setStep3Status("active");
          setStep3Subtitle("Đang chạy mô hình AI đối chiếu năng lực & tính điểm...");
        }
      }, 350);

      const result = await analyzeCvJd({ cvDocumentId: cvId, jobPostingId });

      if (progressTimer) clearInterval(progressTimer);

      setStep2Status("done");
      setStep2Subtitle("Trích xuất nội dung hoàn tất");
      setStep3Status("done");
      setStep3Subtitle("Đối chiếu & chấm điểm hoàn tất!");
      setLoadingProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate(`/bao-cao-cv-jd/${result.id}`);
    } catch (err) {
      if (progressTimer) clearInterval(progressTimer);
      setError(err?.message || "Không thể phân tích CV/JD.");
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  };

  if (isAnalyzing || isUploading) {
    const steps = [
      { title: "Tải lên & đọc tài liệu CV", subtitle: step1Subtitle, status: step1Status },
      { title: "Phân tích nội dung & OCR", subtitle: step2Subtitle, status: step2Status },
      { title: "Chấm điểm & đối chiếu năng lực AI", subtitle: step3Subtitle, status: step3Status },
    ];

    return (
      <main className="interview-legacy min-h-screen bg-[var(--color-bg)]">
        <section className="waiting-shell">
          <div className="waiting-overlay" />
          <article className="waiting-card">
            <header className="waiting-card-head">
              <span className="waiting-head-icon">
                <FileText className="h-7 w-7" />
              </span>
              <h2>Đang đối chiếu CV với JD</h2>
              <p>Hệ thống AI đang tiến hành phân tích...</p>
            </header>

            <div className="waiting-card-body">
              <div className="waiting-step-list">
                {steps.map((item) => (
                  <div key={item.title} className={`waiting-step ${item.status}`}>
                    <div className="waiting-step-icon">
                      {item.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                    </div>
                    <div className="waiting-step-text">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </div>
                    <span className="waiting-step-dot" />
                  </div>
                ))}
              </div>

              <div className="waiting-progress-head">
                <span>{loadingProgress < 100 ? "AI đang tính toán điểm số..." : "Đã hoàn tất phân tích!"}</span>
                <strong>{loadingProgress}%</strong>
              </div>
              <div className="waiting-progress-track">
                <span style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <PageShell>
      <div className="grid gap-5">
        <Button variant="ghost" onClick={() => navigate(`/viec-lam/${jobPostingId}`)} className="w-fit">
          <ArrowLeft size={16} /> Chi tiết JD
        </Button>
        {isLoading ? <JobSkeleton /> : null}
        {!isLoading ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <SectionCard
              title="Chọn CV để chấm điểm"
              subtitle={job ? `${job.title} · ${field(job.company, "Công ty")}` : ""}
            >
              <div className="grid gap-4">
                {error ? (
                  <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    {error}
                  </p>
                ) : null}
                <label className="grid gap-2 text-sm font-bold">
                  CV đã tải lên
                  <select
                    value={selectedCvId}
                    onChange={(event) => setSelectedCvId(event.target.value)}
                    className="input-field"
                  >
                    <option value="">Chọn CV</option>
                    {cvs.map((cv) => (
                      <option key={cv.id} value={cv.id}>
                        {cv.file_name || cv.name || `CV #${cv.id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 rounded-[14px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm font-bold">
                  <span className="inline-flex items-center gap-2">
                    <Upload size={16} /> Tải lên CV PDF mới
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                  {file ? <span className="text-xs text-[var(--color-text-muted)]">{file.name}</span> : null}
                </label>
                <Button onClick={analyze} isLoading={isAnalyzing || isUploading} disabled={!selectedCvId && !file}>
                  {isAnalyzing || isUploading ? <Loader2 size={16} /> : <FileText size={16} />}
                  Đọc CV, đối chiếu JD và lưu báo cáo
                </Button>
              </div>
            </SectionCard>
            <SectionCard title="Trạng thái xử lý">
              <div className="grid gap-3 text-sm text-[var(--color-text-muted)]">
                <Step active={isUploading} done={Boolean(selectedCv || file)} label="Chọn hoặc tải lên CV PDF" />
                <Step active={isAnalyzing} label="Trích xuất nội dung CV" />
                <Step active={isAnalyzing} label="Tính điểm phù hợp với JD" />
                <Step active={isAnalyzing} label="Lưu báo cáo vào cơ sở dữ liệu" />
              </div>
            </SectionCard>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

function Step({ label, active, done }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
      {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />}
      <span className={done ? "font-bold text-[var(--color-text)]" : ""}>{label}</span>
    </div>
  );
}

export function CvJdReportPage() {
  const navigate = useNavigate();
  const { analysisId } = useParams();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mySessions, setMySessions] = useState([]);
  const [isStartingOfficial, setIsStartingOfficial] = useState(false);
  const [isStartingPractice, setIsStartingPractice] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [detail, sessionsData] = await Promise.all([
          fetchCvJdAnalysisDetail({ analysisId }),
          fetchMyInterviewSessions().catch(() => null),
        ]);
        if (!cancelled) {
          setReport(detail);
          setMySessions(sessionsData?.items || sessionsData || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể tải báo cáo CV/JD.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const hasCompletedOfficial = useMemo(() => {
    if (!report?.job_posting_id) return false;
    const activeSessionStatuses = ["created", "questions_generated", "in_progress", "transcribing"];
    return mySessions.some(
      (s) =>
        s.session_type === "official" &&
        String(s.job_posting_id) === String(report.job_posting_id) &&
        !activeSessionStatuses.includes(s.status)
    );
  }, [mySessions, report]);

  const startOfficialInterview = async () => {
    setIsStartingOfficial(true);
    try {
      const session = await createInterviewSession({ sessionType: "official", analysisId });
      navigate(`/phong-van/${session.id}/phong`);
    } catch (err) {
      setError(err?.message || "Không thể tạo phòng phỏng vấn.");
    } finally {
      setIsStartingOfficial(false);
    }
  };

  const startPracticeInterview = async () => {
    if (!report?.job_posting_id) return;
    setIsStartingPractice(true);
    try {
      const session = await createInterviewSession({
        sessionType: "practice",
        jobPostingId: report.job_posting_id,
        cvDocumentId: report.cv_document_id || null,
        analysisId: report.id,
        practiceConfig: {
          target_role: report.job_title_snapshot || "Target Role",
          focus: "General interview",
          level: "General",
          language: "vi",
        },
      });
      navigate(`/luyen-tap/${session.id}/phong`);
    } catch (err) {
      setError(err?.message || "Không thể tạo phòng luyện tập.");
    } finally {
      setIsStartingPractice(false);
    }
  };

  const gap = report?.skill_gap || {};
  const breakdown = report?.score_breakdown || {};

  return (
    <PageShell>
      <div className="grid gap-5">
        {isLoading ? <JobSkeleton /> : null}
        {!isLoading && error ? <EmptyState title="Không thể mở báo cáo" description={error} /> : null}
        {!isLoading && hasCompletedOfficial && (
          <div className="rounded-[12px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500 font-semibold">
            Bạn đã thực hiện phỏng vấn chính thức cho vị trí này với CV đã đối chiếu. Kết quả đã được gửi cho bộ phận HR để xem xét.
          </div>
        )}
        {!isLoading && report ? (
          <>
            <header className="role-hero">
              <div className="role-hero-content">
                <div>
                  <StatusBadge status="active">{Math.round(report.overall_score)} / 100</StatusBadge>
                  <h2>Báo cáo so sánh CV với JD</h2>
                  <p>{report.cv_file_name_snapshot}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={startPracticeInterview} isLoading={isStartingPractice} variant="outline">
                    <Play size={16} /> Luyện tập tự do
                  </Button>
                  {report.job_posting_id ? (
                    <Button
                      onClick={startOfficialInterview}
                      isLoading={isStartingOfficial}
                      disabled={hasCompletedOfficial}
                    >
                      <Play size={16} /> Vào phỏng vấn thật
                    </Button>
                  ) : null}
                </div>
              </div>
            </header>
            <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <SectionCard title="Điểm tổng">
                <div className="grid place-items-center rounded-[20px] bg-[var(--color-primary-soft)] p-6 text-center">
                  <div className="text-5xl font-black text-[var(--color-primary)]">{Math.round(report.overall_score)}</div>
                  <p className="mt-2 text-sm font-bold text-[var(--color-text-muted)]">Điểm tổng</p>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  {[
                    ["Ngữ nghĩa", breakdown.semantic_score],
                    ["Kỹ năng", breakdown.skill_score],
                    ["Kinh nghiệm", breakdown.experience_score],
                    ["Độ tin cậy", breakdown.confidence],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between rounded-[10px] bg-[var(--color-surface-muted)] px-3 py-2">
                      <span>{label}</span>
                      <strong>{Math.round(Number(value || 0))}</strong>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <div className="grid gap-4">
                <SectionCard title="Tóm tắt tổng quan">
                  <p className="text-sm leading-7 text-[var(--color-text)] whitespace-pre-wrap">{report.executive_summary}</p>
                </SectionCard>
                <SectionCard title="Khoảng thiếu kỹ năng">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SkillList title="Hard skill trùng khớp" items={gap.matched_hard_skills || []} />
                    <SkillList title="Hard skill còn thiếu" items={gap.missing_hard_skills || []} />
                  </div>
                </SectionCard>
                <SectionCard title="Kinh nghiệm">
                  <p className="text-sm leading-7 text-[var(--color-text)] whitespace-pre-wrap">{report.deep_experience_alignment}</p>
                </SectionCard>
                <SectionCard title="Khuyến nghị hành động">
                  <ul className="grid gap-2 text-sm leading-6 text-[var(--color-text)]">
                    {(report.actionable_recommendations || []).map((item) => (
                      <li key={item} className="rounded-[12px] bg-[var(--color-surface-muted)] px-3 py-2">{item}</li>
                    ))}
                  </ul>
                </SectionCard>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

function SkillList({ title, items }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <h4 className="text-sm font-extrabold">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span key={item} className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-bold">
            {item}
          </span>
        )) : <span className="text-sm text-[var(--color-text-muted)]">Không có dữ liệu.</span>}
      </div>
    </div>
  );
}
