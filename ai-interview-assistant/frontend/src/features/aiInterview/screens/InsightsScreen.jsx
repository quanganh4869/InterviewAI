import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  UserRound,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DataTableState,
  EmptyState,
  ProgressLine,
  SearchBar,
  SectionCard,
  Select,
  StatusBadge,
} from "../../../components/ui";

const EMAIL_TEMPLATES = {
  nextRound: {
    label: "Mời vòng tiếp theo",
    subject: "Thư mời tham gia vòng phỏng vấn tiếp theo",
    body:
      "Cảm ơn bạn đã hoàn thành phiên phỏng vấn AI. Dựa trên kết quả đánh giá, chúng tôi muốn mời bạn tham gia vòng phỏng vấn tiếp theo với HR/technical team.",
  },
  pass: {
    label: "Thông báo đạt yêu cầu",
    subject: "Kết quả phỏng vấn: Đạt yêu cầu",
    body:
      "Chúc mừng bạn đã đạt yêu cầu trong vòng phỏng vấn vừa qua. Bộ phận tuyển dụng sẽ liên hệ để trao đổi các bước tiếp theo.",
  },
  reject: {
    label: "Thông báo chưa phù hợp",
    subject: "Kết quả phỏng vấn",
    body:
      "Cảm ơn bạn đã dành thời gian tham gia phiên phỏng vấn. Sau khi xem xét, hiện tại hồ sơ của bạn chưa phù hợp với vị trí này. Chúng tôi hy vọng có cơ hội kết nối trong tương lai.",
  },
};

export function mapSessionToCandidate(session) {
  if (!session) return null;
  const candUser = session.candidate_user || {};
  const candidateEmail = candUser.email || session.candidate_email || "";
  const candidateName =
    candUser.name ||
    session.candidate_name ||
    candidateEmail ||
    `Ứng viên #${session.candidate_user_id || session.id}`;
  const evalData = session.evaluation || {};
  const evalDetails = evalData.evaluation || {};
  
  const strengths = evalDetails.strengths || [];
  const improvements = evalDetails.weaknesses || [];
  
  const qMap = {};
  (session.questions || []).forEach(q => {
    qMap[q.id] = q.question_text;
  });
  
  const transcript = (session.answers || []).map(ans => ({
    question: qMap[ans.question_id] || "Câu hỏi phỏng vấn",
    answer: ans.transcript || "Không có câu trả lời bằng văn bản.",
    score: Math.round(ans.duration_seconds || 0), 
  }));

  let status = "reviewing";
  if (session.status === "completed") {
    const score = evalData.overall_score ?? 0;
    status = score >= 80 ? "passed" : "pending";
  } else if (session.status === "failed") {
    status = "rejected";
  }
  
  return {
    id: String(session.id),
    name: candidateName,
    email: candidateEmail,
    phone: candUser.phone || "N/A",
    avatar: (candidateName || candidateEmail || "U").charAt(0).toUpperCase(),
    jdTitle: session.job_posting?.title || "N/A",
    jdId: String(session.job_posting?.id || ""),
    appliedAt: session.created_at ? new Date(session.created_at).toLocaleDateString("vi-VN") : "N/A",
    status,
    cv: session.cv_document?.title || session.cv_document?.fileName || "CV_candidate.pdf",
    interviewScore: Math.round(evalData.overall_score || 0),
    matchScore: Math.round(session.analysis?.overall_score || evalData.jd_alignment_score || 0),
    communication: Math.round(evalData.communication_score || 0),
    recommendation: evalDetails.hiring_recommendation || "Cần HR review thêm kết quả.",
    summary: evalDetails.overall_feedback || evalDetails.executive_summary || "Chưa có nhận xét tổng quát.",
    strengths: strengths.length ? strengths : ["Có thái độ hợp tác tốt.", "Trả lời đầy đủ các câu hỏi."],
    improvements: improvements.length ? improvements : ["Cần bổ sung kỹ năng thực chiến.", "Nên trình bày mạch lạc hơn."],
    transcript: transcript,
  };
}

function getStatusLabel(status) {
  const labels = {
    reviewing: "Đang review",
    passed: "Đạt yêu cầu",
    pending: "Cần xem thêm",
    rejected: "Từ chối",
  };
  return labels[status] || status;
}

function getStatusTone(status) {
  if (status === "passed") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "primary";
}

function averageScore(rows, key) {
  if (!rows.length) return 0;
  return Math.round(rows.reduce((total, row) => total + Number(row[key] || 0), 0) / rows.length);
}

function CandidateIdentity({ candidate }) {
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <div className="candidate-avatar">{candidate.avatar}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--color-text)]">{candidate.name}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{candidate.email}</p>
      </div>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="info-line">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getPreferredEmailTemplate(candidate) {
  if (candidate?.status === "rejected") return EMAIL_TEMPLATES.reject;
  if (candidate?.status === "passed") return EMAIL_TEMPLATES.pass;
  return EMAIL_TEMPLATES.nextRound;
}

function buildCandidateEmailBody(candidate, template) {
  return [
    `Xin chào ${candidate.name},`,
    "",
    template.body,
    "",
    `Tóm tắt AI: ${candidate.summary}`,
  ].join("\n");
}

function buildGmailComposeUrl(candidate) {
  const template = getPreferredEmailTemplate(candidate);
  const url = new URL("https://mail.google.com/mail/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("to", candidate.email);
  url.searchParams.set("su", template.subject);
  url.searchParams.set("body", buildCandidateEmailBody(candidate, template));
  return url.toString();
}

function openCandidateEmail(candidate) {
  if (!candidate || typeof window === "undefined") return;
  if (!candidate.email) return;
  window.open(buildGmailComposeUrl(candidate), "_blank", "noopener,noreferrer");
}

export function CandidateReviewDetailScreen({ hrInterviewSessions = [] }) {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  
  const candidate = useMemo(() => {
    const session = hrInterviewSessions.find((item) => String(item.id) === String(candidateId));
    return mapSessionToCandidate(session);
  }, [hrInterviewSessions, candidateId]);

  if (!candidate) {
    return (
      <div className="review-workspace role-workspace hr space-y-6">
        <SectionCard title="Không tìm thấy ứng viên" subtitle="Ứng viên không tồn tại hoặc đã bị xóa khỏi danh sách review.">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => navigate("/dashboard?screen=insights")}>
              <ArrowLeft size={16} /> Quay lại danh sách
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="review-workspace role-workspace hr space-y-6">
      <header className="role-hero">
        <div className="role-hero-content">
          <div>
            <h2>{candidate.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/dashboard?screen=insights")}>
              <ArrowLeft size={16} /> Quay lại
            </Button>
            <Button variant="primary" onClick={() => openCandidateEmail(candidate)} disabled={!candidate.email}>
              <Mail size={16} /> Liên hệ
            </Button>
          </div>
        </div>
      </header>

      <SectionCard
        title="Hồ sơ ứng viên"
        subtitle={`${candidate.jdTitle} - ${candidate.appliedAt}`}
        action={
          <StatusBadge status={candidate.status} tone={getStatusTone(candidate.status)}>
            {getStatusLabel(candidate.status)}
          </StatusBadge>
        }
      >
        <div className="candidate-detail-panel">
          <div className="candidate-detail-head">
            <CandidateIdentity candidate={candidate} />
            <Badge tone="primary">{candidate.jdTitle}</Badge>
          </div>

          <div className="candidate-info-grid">
            <InfoLine icon={Mail} label="Email" value={candidate.email} />
            <InfoLine icon={Phone} label="SĐT" value={candidate.phone} />
            <InfoLine icon={FileText} label="CV" value={candidate.cv} />
            <InfoLine icon={BriefcaseBusiness} label="JD" value={candidate.jdTitle} />
            <InfoLine icon={CalendarDays} label="Ngày ứng tuyển" value={candidate.appliedAt} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <ProgressLine label="Interview score" value={candidate.interviewScore} />
              <ProgressLine label="Match score" value={candidate.matchScore} />
              <ProgressLine label="Communication" value={candidate.communication} />
            </div>
            <div className="candidate-summary-card">
              <strong>Đề xuất</strong>
              <p>{candidate.recommendation}</p>
              <span>{candidate.summary}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="feedback-list good">
              <h4>
                <CheckCircle2 size={16} /> Điểm mạnh
              </h4>
              {candidate.strengths.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
            <div className="feedback-list risk">
              <h4>
                <XCircle size={16} /> Cần cân nhắc
              </h4>
              {candidate.improvements.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div className="transcript-preview">
            <h4>Transcript phỏng vấn AI</h4>
            {candidate.transcript.map((item, index) => (
              <article key={`${candidate.id}-${index}`}>
                <div>
                  <Badge tone="primary">Q{index + 1}</Badge>
                  <strong>{item.question}</strong>
                  <span>{item.score}%</span>
                </div>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export function InsightsScreen({ hrInterviewSessions = [], jdRows = [], isAdmin = false }) {
  const [query, setQuery] = useState("");
  const [selectedJd, setSelectedJd] = useState("all");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const navigate = useNavigate();

  const toggleSelectSession = (id) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };


  const REVIEW_JOBS_SOURCE = useMemo(() => {
    return jdRows.map(job => ({
      id: String(job.jobPostingId || job.id),
      title: job.title,
      department: job.company || "N/A",
      location: job.location || "",
    }));
  }, [jdRows]);

  const REVIEW_CANDIDATES_SOURCE = useMemo(() => {
    return hrInterviewSessions.map(session => mapSessionToCandidate(session)).filter(Boolean);
  }, [hrInterviewSessions]);

  const filteredCandidates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return REVIEW_CANDIDATES_SOURCE.filter((candidate) => {
      const matchesJd = selectedJd === "all" || candidate.jdId === selectedJd;
      const matchesKeyword =
        !keyword ||
        [candidate.name, candidate.email, candidate.phone, candidate.jdTitle, candidate.cv]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return matchesJd && matchesKeyword;
    });
  }, [query, selectedJd]);

  const selectedJob = selectedJd === "all" ? null : REVIEW_JOBS_SOURCE.find((job) => job.id === selectedJd);
  const waitingCount = REVIEW_CANDIDATES_SOURCE.filter((candidate) => candidate.status === "reviewing" || candidate.status === "pending").length;
  const passReadyCount = REVIEW_CANDIDATES_SOURCE.filter((candidate) => candidate.interviewScore >= 85 && candidate.matchScore >= 85).length;

  return (
    <div className="review-workspace role-workspace hr space-y-6">
      <header className="role-hero">
        <div className="role-hero-content">
          <div>
            <h2>Review ứng viên</h2>
          </div>
        </div>
      </header>

      <div className="role-stat-grid">
        <article className="role-stat">
          <span>Ứng viên</span>
          <strong>{REVIEW_CANDIDATES_SOURCE.length}</strong>
          <p>Đã hoàn thành phỏng vấn AI</p>
        </article>
        <article className="role-stat">
          <span>Đang chờ HR</span>
          <strong>{waitingCount}</strong>
          <p>Cần quyết định tiếp theo</p>
        </article>
        <article className="role-stat">
          <span>Shortlist</span>
          <strong>{passReadyCount}</strong>
          <p>Score AI và match đều cao</p>
        </article>
        <article className="role-stat">
          <span>Điểm TB</span>
          <strong>{averageScore(REVIEW_CANDIDATES_SOURCE, "interviewScore")}%</strong>
          <p>Interview score</p>
        </article>
      </div>

      <div className="review-board">
        <SectionCard
          title="JD đang review"
          subtitle="Chọn JD để xem danh sách ứng viên đã phỏng vấn"
          className="review-jd-panel"
        >
          <div className="space-y-3">
            <button
              type="button"
              className={`review-job-card ${selectedJd === "all" ? "active" : ""}`}
              onClick={() => setSelectedJd("all")}
            >
              <div>
                <strong>Tất cả JD</strong>
                <span>{REVIEW_CANDIDATES_SOURCE.length} ứng viên</span>
              </div>
              <Badge tone="primary">All</Badge>
            </button>
            {REVIEW_JOBS_SOURCE.map((job) => {
              const count = REVIEW_CANDIDATES_SOURCE.filter((candidate) => candidate.jdId === job.id).length;
              return (
                <button
                  key={job.id}
                  type="button"
                  className={`review-job-card ${selectedJd === job.id ? "active" : ""}`}
                  onClick={() => setSelectedJd(job.id)}
                >
                  <div>
                    <strong>{job.title}</strong>
                    <span>{job.department}</span>
                    <small>{job.location}</small>
                  </div>
                  <Badge tone="success">{count} CV</Badge>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="Danh sách ứng viên"
            subtitle={selectedJob ? `${selectedJob.title} - ${selectedJob.location}` : "Tất cả ứng viên theo JD"}
          >
            <div className="review-toolbar">
              <SearchBar
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên, email, SĐT, CV..."
              />
              <Select value={selectedJd} onChange={(event) => setSelectedJd(event.target.value)} aria-label="Lọc JD">
                <option value="all">Tất cả JD</option>
                {REVIEW_JOBS_SOURCE.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </Select>
            </div>

            <DataTable
              columns={[
                { key: "select", label: "" },
                { key: "candidate", label: "Ứng viên" },
                { key: "jd", label: "JD applied" },
                { key: "score", label: "AI score" },
                { key: "actions", label: "Thao tác" },
              ]}
            >
              {filteredCandidates.length ? (
                filteredCandidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(Number(candidate.id))}
                        onChange={() => toggleSelectSession(Number(candidate.id))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        aria-label="Chọn ứng viên so sánh"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="w-full rounded-[8px] p-1 text-left transition hover:bg-[var(--color-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        onClick={() => navigate(`/dashboard/candidates/${candidate.id}`)}
                      >
                        <CandidateIdentity candidate={candidate} />
                      </button>
                    </td>

                    <td>
                      <div className="text-sm font-bold text-[var(--color-text)]">{candidate.jdTitle}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{candidate.appliedAt}</div>
                    </td>
                    <td>
                      <div className="score-stack">
                        <span>Interview {candidate.interviewScore}%</span>
                        <span>Match {candidate.matchScore}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openCandidateEmail(candidate)} disabled={!candidate.email}>
                          <Mail size={15} /> Liên hệ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <DataTableState colSpan={5}>
                  <EmptyState
                    icon={UserRound}
                    title="Không có ứng viên phù hợp"
                    description="Thử đổi từ khóa tìm kiếm hoặc bộ lọc JD."
                  />
                </DataTableState>
              )}
            </DataTable>
          </SectionCard>

          {/* Comparative floating bar */}
          {selectedSessionIds.length >= 2 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
              <span className="text-sm font-bold">Đã chọn {selectedSessionIds.length} ứng viên</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSessionIds([])}
                  className="text-slate-400 hover:text-white border border-slate-700 bg-transparent hover:bg-slate-800"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/phong-van/so-sanh?sessionIds=${selectedSessionIds.join(",")}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                >
                  <Sparkles size={14} className="mr-1.5" /> So sánh kết quả bằng Gemini
                </Button>
              </div>
            </div>
          )}


        </div>
      </div>

    </div>
  );
}
