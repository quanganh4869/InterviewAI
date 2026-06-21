import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  FileSearch,
  MapPin,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Badge, Button, EmptyState, LoadingModal, Pill, ProgressLine, StatusBadge } from "../../../components/ui";

function buildTextFromUploadedJd(jd) {
  if (!jd) return "";
  const hasStructuredContent = Boolean(jd.description || jd.requirements || jd.benefits);
  return [
    jd.title || "",
    jd.company || "",
    jd.location ? `Location: ${jd.location}` : "",
    jd.salary ? `Salary: ${jd.salary}` : "",
    jd.workType ? `Work type: ${jd.workType}` : "",
    jd.experience ? `Experience: ${jd.experience}` : "",
    jd.level ? `Level: ${jd.level}` : "",
    jd.deadline ? `Deadline: ${jd.deadline}` : "",
    jd.description ? `Job description:\n${jd.description}` : "",
    jd.requirements ? `Requirements:\n${jd.requirements}` : "",
    jd.benefits ? `Benefits:\n${jd.benefits}` : "",
    hasStructuredContent ? "" : jd.summary || "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function getMatchTone(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function getJobListInfo(job) {
  return [
    job?.experience ? `Kinh nghiệm: ${job.experience}` : "",
    job?.level ? `Level: ${job.level}` : "",
    job?.deadline ? `Hạn ứng tuyển: ${job.deadline}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

export function JobDetailScreen({
  userRole = "",
  selectedJd,
  jdRows = [],
  onSelectJd,
  cvRows = [],
  onCompareCvJd,
  onBack,
  onBackToJobList,
  onStartInterview,
  onStartPractice,
  publicJobsError = "",
  showBack = false,
  managementOnly = false,
}) {
  const [compareState, setCompareState] = useState("idle");
  const [compareResult, setCompareResult] = useState(null);
  const [compareError, setCompareError] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [jdSource, setJdSource] = useState("selected");
  const [jdInputText, setJdInputText] = useState("");
  const isManualJdInput = jdSource === "manual";

  const selectedJdText = useMemo(() => buildTextFromUploadedJd(selectedJd), [selectedJd]);

  useEffect(() => {
    setCompareState("idle");
    setCompareResult(null);
    setCompareError("");
    setCompareOpen(false);
    setSelectedCvId("");
    setJdSource("selected");
    setJdInputText(selectedJdText);
  }, [selectedJd?.id, selectedJdText]);

  useEffect(() => {
    if (jdSource === "selected") {
      setJdInputText(selectedJdText);
      return;
    }

    if (jdSource.startsWith("uploaded:")) {
      const jdId = Number(jdSource.split(":")[1] || 0);
      const target = jdRows.find((item) => Number(item.id) === jdId);
      setJdInputText(buildTextFromUploadedJd(target));
    }
  }, [jdSource, jdRows, selectedJdText]);

  const handleCompare = async () => {
    const finalJdText = String(jdInputText || "").trim();

    if (!selectedJd && jdSource !== "manual" && !jdSource.startsWith("uploaded:")) {
      setCompareError("Bạn chưa có JD. Hãy upload JD hoặc nhập tay nội dung JD.");
      return;
    }

    if (!finalJdText) {
      setCompareError("Vui lòng nhập nội dung JD trước khi so sánh.");
      return;
    }

    setCompareOpen(false);
    setCompareError("");
    setCompareState("loading");

    try {
      const result = await onCompareCvJd?.({
        cvDocumentId: Number(selectedCvId),
        jdText: finalJdText,
      });

      if (!result) {
        throw new Error("No match result returned.");
      }

      setCompareResult({
        total: Math.round(Number(result.match_score || 0)),
        cvId: Number(selectedCvId),
        met: Array.isArray(result.matched_skills) ? result.matched_skills : [],
        missing: Array.isArray(result.missing_skills) ? result.missing_skills : [],
        semanticScore: Number(result.semantic_score || 0),
        skillScore: Number(result.skill_score || 0),
        experienceScore: Number(result.experience_score || 0),
        recommendation: result.recommendation || "N/A",
        evaluation: result.evaluation || "",
      });
      setCompareState("done");
    } catch (error) {
      setCompareState("idle");
      setCompareError(error?.message || "Không thể chấm điểm CV/JD.");
    }
  };

  const hasJds = jdRows.length > 0;
  const hasCvs = cvRows.length > 0;
  const normalizedRole = String(userRole || "").toLowerCase();
  const isRecruiter = normalizedRole.includes("hr") || normalizedRole.includes("recruiter");
  const roleClass = managementOnly ? "admin" : isRecruiter ? "hr" : "user";
  const isCandidate = !managementOnly && !isRecruiter;
  const displayJobs = jdRows;
  const displayJd = selectedJd;
  const isCandidateDetail = isCandidate && Boolean(displayJd);

  const openCompareDialog = () => {
    setJdSource("selected");
    setJdInputText(buildTextFromUploadedJd(displayJd));
    setCompareOpen(true);
  };

  const handleBackToJobList = () => {
    onBackToJobList?.();
  };

  const focusCompareSetup = () => {
    if (typeof document === "undefined") return;
    document.getElementById("compare-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isCandidate && !isCandidateDetail) {
    return (
      <div className="role-workspace user job-board-page">
        <header className="role-hero">
          <div className="role-hero-content">
            <div>
              <h2>Việc làm phù hợp với hồ sơ</h2>
            </div>
            <StatusBadge status="active">{displayJobs.length} vị trí</StatusBadge>
          </div>
        </header>

        <section className="job-board-toolbar">
          <div>
            <strong>Danh sách việc làm</strong>
            <span>Chọn vị trí để xem chi tiết.</span>
          </div>
          <div className="job-board-filters">
            <Badge tone="primary">Full-time</Badge>
            <Badge tone="success">Phù hợp</Badge>
            <Badge>Remote/Hybrid</Badge>
          </div>
        </section>

        {displayJobs.length ? (
          <section className="job-board-list-preview">
            {displayJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                className="job-preview-card"
                onClick={() => onSelectJd?.(job.id)}
              >
                <div className="job-preview-main">
                  <div className="job-preview-icon">
                    <Briefcase size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="job-preview-eyebrow">
                      <Badge tone="primary">{job.postedAt || "Đang tuyển"}</Badge>
                      {job.level ? <Badge>{job.level}</Badge> : null}
                    </div>
                    <h3>{job.title || job.fileName || `Vị trí #${job.id}`}</h3>
                    <p className="job-preview-company">{job.company || "N/A"}</p>
                    <p className="job-preview-excerpt">
                      {getJobListInfo(job) || "Bấm vào vị trí để xem đầy đủ thông tin tuyển dụng."}
                    </p>
                    <div className="job-preview-meta">
                      <span>
                        <MapPin size={15} /> {job.location || "Linh hoạt"}
                      </span>
                      <span>
                        <WalletCards size={15} /> {job.salary || "Thỏa thuận"}
                      </span>
                      <span>
                        <Clock3 size={15} /> {job.workType || "Full-time"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </section>
        ) : (
          <section className="section-card">
            <EmptyState
              title="Chưa có việc làm"
              description={publicJobsError || "Chỉ JD đã được HR/Admin bấm Đăng cho ứng viên mới xuất hiện ở đây. Hiện chưa có JD published để so sánh."}
              icon={Briefcase}
            />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className={`role-workspace ${roleClass} ${isCandidateDetail ? "job-detail-page space-y-6" : "grid gap-6 lg:grid-cols-12"}`}>
      {!isCandidateDetail ? (
      <aside className="space-y-4 lg:col-span-4">
        <div className="section-card">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
                {isCandidate ? "Việc làm gợi ý" : "Danh sách JD"}
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>
                {managementOnly
                  ? "Kiểm tra JD trong hệ thống và chạy đối chiếu quản trị."
                  : isRecruiter
                    ? "Quản lý JD đang tuyển và xem ứng viên ở màn Review."
                    : "Chọn một vị trí để xem chi tiết, kiểm tra độ phù hợp và luyện phỏng vấn."}
              </p>
            </div>
            <StatusBadge status={displayJobs.length ? "active" : "inactive"}>
              {displayJobs.length ? `${displayJobs.length} vị trí` : "Trống"}
            </StatusBadge>
          </div>

          {displayJobs.length ? (
            <div className="max-h-[600px] space-y-2 overflow-y-auto pr-2">
              {displayJobs.map((item) => (
                <button
	                  key={item.id}
	                  onClick={() => {
	                    onSelectJd?.(item.id);
	                  }}
                  className={`w-full rounded-xl p-4 text-left transition ${
                    Number(item.id) === Number(selectedJd?.id)
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-transparent hover:bg-[var(--color-surface-muted)]"
                  } border`}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <h4 className="line-clamp-1 font-bold" style={{ color: "var(--text)" }}>
                      {item.title || item.fileName || `JD #${item.id}`}
                    </h4>
                    <Briefcase size={14} style={{ color: "var(--text-soft)" }} />
                  </div>
                  <p className="mb-2 text-xs" style={{ color: "var(--text-soft)" }}>
                    {item.company || "N/A"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Pill>{item.postedAt || "N/A"}</Pill>
                    {item.workType ? <Pill>{item.workType}</Pill> : null}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có JD" description="Tải JD lên ở màn hình CV & JD để bắt đầu review." icon={Briefcase} />
          )}
        </div>
      </aside>
      ) : null}

      <main className={isCandidateDetail ? "space-y-6" : "space-y-6 lg:col-span-8"}>
        {isCandidateDetail ? (
          <button type="button" className="job-detail-back" onClick={handleBackToJobList}>
            <ArrowLeft size={18} />
            Quay lại danh sách việc làm
          </button>
        ) : null}
        <header className="role-hero">
          <div className="role-hero-content">
          <div>
            <StatusBadge status={managementOnly ? "active" : isRecruiter ? "reviewing" : "applied"}>
              {managementOnly ? "Đối chiếu" : isRecruiter ? "Review" : "Gợi ý"}
            </StatusBadge>
            <h2>
              {displayJd?.title || (isCandidate ? "Việc làm phù hợp với hồ sơ" : "Đối chiếu CV/JD")}
            </h2>
            <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: "var(--text-soft)" }}>
              <span>{displayJd?.company || "JD nhập tay"}</span>
              {displayJd?.postedAt ? (
                <>
                  <span>•</span>
                  <span>{displayJd.postedAt}</span>
                </>
              ) : null}
            </div>
          </div>
          {showBack ? (
            <button onClick={onBack} className="rounded-full p-2 transition hover:bg-slate-100" aria-label="Quay lại">
              <ArrowLeft size={20} />
            </button>
          ) : null}
          </div>
        </header>

        {isCandidate ? (
          <section className="job-portal-detail">
            <div className="job-portal-head">
              <div>
                <h3>{displayJd?.title || "Chọn một vị trí"}</h3>
                <p>Đọc thông tin JD đầy đủ bên dưới, sau đó chọn CV để chấm điểm phù hợp.</p>
              </div>
              <Button variant="primary" onClick={focusCompareSetup} disabled={!hasCvs}>
                <Sparkles size={16} /> Chọn CV để chấm điểm
              </Button>
            </div>
            <div className="job-meta-grid">
              <span>
                <Building2 size={16} /> {displayJd?.company || "N/A"}
              </span>
              <span>
                <MapPin size={16} /> {displayJd?.location || "Linh hoạt"}
              </span>
              <span>
                <WalletCards size={16} /> {displayJd?.salary || "Thỏa thuận"}
              </span>
              <span>
                <Clock3 size={16} /> {displayJd?.workType || "Full-time"}
              </span>
            </div>
            <div className="mt-5 grid gap-4">
              {displayJd?.description ? (
                <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <h4 className="mb-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    Mô tả công việc
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                    {displayJd.description}
                  </p>
                </section>
              ) : null}
              {displayJd?.requirements ? (
                <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <h4 className="mb-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    Yêu cầu ứng viên
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                    {displayJd.requirements}
                  </p>
                </section>
              ) : null}
              {displayJd?.benefits ? (
                <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <h4 className="mb-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    Quyền lợi
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                    {displayJd.benefits}
                  </p>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}

        {isCandidate ? (
          <section id="compare-setup" className="compare-setup-page">
            <div>
              <Badge tone="primary">Bước 1</Badge>
              <h3>Chọn CV để so sánh với JD</h3>
              <p>Chọn hồ sơ bạn muốn dùng cho vị trí này. Hệ thống chấm độ phù hợp dựa trên kỹ năng, kinh nghiệm và nội dung JD thật.</p>
            </div>
            <div className="compare-setup-controls">
              <select
                className="ds-input px-3"
                value={selectedCvId}
                onChange={(event) => setSelectedCvId(event.target.value)}
                aria-label="Chọn CV để so sánh"
              >
                <option value="">Chọn CV</option>
                {cvRows.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>
              <Button variant="primary" disabled={!selectedCvId || compareState === "loading"} onClick={handleCompare}>
                <Sparkles size={16} /> Chấm điểm CV/JD
              </Button>
            </div>
          </section>
        ) : null}

        <section className="ai-card p-6">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-full w-full -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="transparent"
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * (compareResult?.total || 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-xl font-bold text-blue-700">{compareResult ? `${compareResult.total}%` : "--"}</span>
              </div>
              <StatusBadge status={compareState === "done" ? getMatchTone(compareResult?.total || 0) : "pending"} tone={compareState === "done" ? getMatchTone(compareResult?.total || 0) : "warning"}>
                {compareState === "done" ? "Đã phân tích" : "Chưa chấm"}
              </StatusBadge>
            </div>

            <div className="flex-1">
              {compareError ? (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{compareError}</div>
              ) : null}

              {compareState === "idle" ? (
                <div className="text-center md:text-left">
                  <h3 className="mb-2 flex items-center justify-center gap-2 font-bold md:justify-start" style={{ color: "var(--text)" }}>
                    <FileSearch className="h-4 w-4 text-[var(--color-primary)]" />
                    {isCandidate ? "Điểm phù hợp CV/JD" : "Chấm điểm phù hợp CV/JD"}
                  </h3>
                  <p className="mb-4 text-sm" style={{ color: "var(--text-soft)" }}>
                    {isCandidate
                      ? "Hệ thống đối chiếu CV của bạn với vị trí đang chọn để gợi ý khả năng phù hợp, điểm mạnh và phần cần bổ sung trước khi ứng tuyển."
                      : "Hệ thống so sánh kỹ năng, kinh nghiệm và ngữ nghĩa giữa CV được chọn với JD hiện tại."}
                  </p>
                  <Button variant="primary" onClick={isCandidate ? focusCompareSetup : openCompareDialog} disabled={!hasCvs}>
                    <Sparkles size={16} /> {isCandidate ? "Chọn CV để chấm điểm" : "So sánh ngay"}
                  </Button>
                </div>
              ) : null}

              {compareState === "loading" ? (
                <div className="flex flex-col items-center gap-3 md:items-start">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.5s]" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Đang phân tích hồ sơ...
                  </p>
                </div>
              ) : null}

              {compareState === "done" && compareResult ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <ProgressLine label="Semantic" value={compareResult.semanticScore} />
                    <ProgressLine label="Skill" value={compareResult.skillScore} />
                    <ProgressLine label="Experience" value={compareResult.experienceScore} />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-[var(--color-text)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                    {isCandidate ? "Gợi ý nghề nghiệp" : "Recommendation"}: {compareResult.recommendation}
                  </div>
                  {compareResult.evaluation ? <p className="text-xs text-slate-600">{compareResult.evaluation}</p> : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-2 whitespace-nowrap text-sm font-bold text-emerald-700">
                        {isCandidate ? "Điểm phù hợp" : "Kỹ năng đáp ứng"}
                      </h4>
                      <ul className="space-y-1 text-xs" style={{ color: "var(--text-soft)" }}>
                        {(compareResult.met.length ? compareResult.met : ["N/A"]).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 whitespace-nowrap text-sm font-bold text-amber-700">
                        {isCandidate ? "Nên bổ sung trước khi apply" : "Cần bổ sung"}
                      </h4>
                      <ul className="space-y-1 text-xs" style={{ color: "var(--text-soft)" }}>
                        {(compareResult.missing.length ? compareResult.missing : ["N/A"]).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {!managementOnly ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="section-card flex flex-col items-center text-center">
              <h4 className="mb-1 font-bold" style={{ color: "var(--text)" }}>
                {isCandidate ? "Mô phỏng phỏng vấn vị trí này" : "Phỏng vấn thật"}
              </h4>
              <Button variant="primary" className="w-full" disabled={compareState !== "done"} onClick={() => onStartInterview?.({ cvId: compareResult?.cvId })}>
                {isCandidate ? "Vào Interview Studio" : "Vào phỏng vấn thật"}
              </Button>
            </div>
            <div className="section-card flex flex-col items-center text-center">
              <h4 className="mb-1 font-bold" style={{ color: "var(--text)" }}>
                {isCandidate ? "Luyện tập trước khi ứng tuyển" : "Luyện tập với AI"}
              </h4>
              <Button variant="secondary" className="w-full" onClick={onStartPractice}>
                Luyện tập ngay
              </Button>
            </div>
          </div>
        ) : null}

      </main>

      {compareOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-in zoom-in-95 rounded-3xl p-6 shadow-2xl duration-200" style={{ backgroundColor: "var(--card-bg)" }}>
            <h3 className="mb-2 text-xl font-bold" style={{ color: "var(--text)" }}>
              {isCandidate ? "Chọn CV và vị trí ứng tuyển" : "Chọn CV và JD"}
            </h3>

            <div className="grid gap-4">
              <select
                className="ds-input px-3"
                style={{ backgroundColor: "var(--card-soft)", borderColor: "var(--border)", color: "var(--text)" }}
                value={selectedCvId}
                onChange={(event) => setSelectedCvId(event.target.value)}
              >
                <option value="">Chọn CV</option>
                {cvRows.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>

              <select
                className="ds-input px-3"
                style={{ backgroundColor: "var(--card-soft)", borderColor: "var(--border)", color: "var(--text)" }}
                value={jdSource}
                onChange={(event) => setJdSource(event.target.value)}
              >
                <option value="selected">{isCandidate ? "Vị trí đang chọn" : "JD đang chọn"}</option>
                {jdRows.map((jd) => (
                  <option key={jd.id} value={`uploaded:${jd.id}`}>
                    {jd.title || jd.fileName || `JD #${jd.id}`}
                  </option>
                ))}
                <option value="manual">{isCandidate ? "Nhập mô tả việc làm" : "Nhập tay JD"}</option>
              </select>

              {isManualJdInput ? (
                <textarea
                  rows={12}
                  className="ds-input min-h-48 p-3 text-sm"
                  style={{ backgroundColor: "var(--card-soft)", borderColor: "var(--border)", color: "var(--text)" }}
                  value={jdInputText}
                  onChange={(event) => setJdInputText(event.target.value)}
                  placeholder={isCandidate ? "Nhập hoặc chỉnh sửa mô tả việc làm để chấm điểm..." : "Nhập hoặc chỉnh sửa JD để so sánh..."}
                />
              ) : (
                <div
                  className="rounded-xl border p-3 text-sm"
                  style={{ backgroundColor: "var(--card-soft)", borderColor: "var(--border)", color: "var(--text-soft)" }}
                >
                  {jdInputText || (isCandidate ? "Không có mô tả việc làm." : "Không có nội dung JD.")}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setCompareOpen(false)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" className="flex-1" disabled={!selectedCvId || compareState === "loading"} onClick={handleCompare}>
                {isCandidate ? "Chấm điểm" : "Phân tích"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LoadingModal isOpen={compareState === "loading"} />
    </div>
  );
}
