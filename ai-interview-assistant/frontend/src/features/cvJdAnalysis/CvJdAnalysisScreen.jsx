import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSearch,
  History,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  analyzeCvJd,
  createInterviewSession,
  fetchCvJdAnalysisDetail,
  fetchCvJdAnalysisHistory,
  fetchMyDocuments,
  uploadCvDocument,
} from "../../api";
import {
  Badge,
  Button,
  DataTable,
  DataTableState,
  EmptyState,
  PageHeader,
  ProgressLine,
  SectionCard,
  Select,
  Textarea,
} from "../../components/ui";
import { dispatchNotice } from "../../utils/notice";

const HISTORY_COLUMNS = [
  { key: "created", label: "Thời điểm" },
  { key: "cv", label: "CV" },
  { key: "score", label: "Điểm" },
  { key: "summary", label: "Tóm tắt" },
  { key: "action", label: "" },
];

function formatDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString("vi-VN");
}

function isPdfDocument(document) {
  const fileName = String(document?.file_name || "").toLowerCase();
  const mimeType = String(document?.mime_type || "").toLowerCase();
  return mimeType === "application/pdf" || fileName.endsWith(".pdf");
}

function scoreTone(score) {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

function SkillList({ items, emptyText }) {
  if (!items?.length) {
    return <p className="text-sm text-[var(--color-text-muted)]">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
    </div>
  );
}

function ReportPanel({ report, onStartInterview, isStartingInterview }) {
  if (!report) {
    return (
      <SectionCard>
        <EmptyState
          icon={FileSearch}
          title="Chưa có report"
          description="Chọn CV PDF, nhập JD và chạy phân tích để xem kết quả."
        />
      </SectionCard>
    );
  }

  const skillGap = report.skill_gap || {};
  const breakdown = report.score_breakdown || {};
  const experience = breakdown.experience || {};
  const extraction = breakdown.cv_extraction || {};
  const overallScore = Number(report.overall_score || 0);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Report phân tích"
        subtitle={`${report.cv_file_name_snapshot} - ${formatDate(report.created_at)}`}
        action={
          <div className="flex items-center gap-2">
            {onStartInterview ? (
              <Button
                variant="primary"
                size="sm"
                isLoading={isStartingInterview}
                onClick={() => onStartInterview(report)}
              >
                Vào phỏng vấn thật
              </Button>
            ) : null}
            <Badge tone={scoreTone(overallScore)}>{overallScore.toFixed(2)}%</Badge>
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
          <div className="grid min-h-40 place-items-center rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <div className="text-center">
              <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Overall score
              </p>
              <p className="text-4xl font-extrabold text-[var(--color-text)]">
                {Math.round(overallScore)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm leading-6 text-[var(--color-text)] whitespace-pre-wrap">
              {report.executive_summary}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <ProgressLine label="Semantic" value={Number(breakdown.semantic_score || 0)} />
              <ProgressLine label="Hard skill" value={Number(breakdown.skill_score || 0)} />
              <ProgressLine
                label="Experience"
                value={Number(breakdown.experience_score || 0)}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
              {breakdown.recommendation ? (
                <Badge tone={scoreTone(overallScore)}>{breakdown.recommendation}</Badge>
              ) : null}
              {breakdown.confidence != null ? (
                <Badge>Confidence: {Number(breakdown.confidence || 0).toFixed(0)}%</Badge>
              ) : null}
              <Badge>Semantic: {breakdown.semantic_method || "unknown"}</Badge>
              <Badge>CV: {experience.cv_years || 0} năm</Badge>
              <Badge>JD: {experience.jd_years || 0} năm</Badge>
              <Badge>
                Parse: {extraction.mode || "unknown"}
                {extraction.ocr_used ? " + OCR" : ""}
              </Badge>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Skill gap" subtitle="Hard skills nhận diện từ CV và JD">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-bold text-[var(--color-success)]">
                Kỹ năng trùng khớp
              </p>
              <SkillList
                items={skillGap.matched_hard_skills}
                emptyText="Chưa nhận diện hard skill trùng khớp."
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-[var(--color-warning)]">
                Kỹ năng còn thiếu
              </p>
              <SkillList
                items={skillGap.missing_hard_skills}
                emptyText="Không có hard skill thiếu từ JD đã nhận diện."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Kinh nghiệm" subtitle="Đối chiếu số năm được bóc tách">
          <p className="text-sm leading-6 text-[var(--color-text)] whitespace-pre-wrap">
            {report.deep_experience_alignment}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Khuyến nghị hành động">
        <ol className="grid gap-2 text-sm text-[var(--color-text)]">
          {(report.actionable_recommendations || []).map((item) => (
            <li
              key={item}
              className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}

export default function CvJdAnalysisScreen({ userRole = "" }) {
  const navigate = useNavigate();
  const [cvDocuments, setCvDocuments] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [loadingReportId, setLoadingReportId] = useState(null);
  const [formError, setFormError] = useState("");

  const normalizedRole = String(userRole || "").toLowerCase();
  const roleClass = normalizedRole.includes("admin") ? "admin" : "hr";
  const selectedCv = useMemo(
    () => cvDocuments.find((item) => String(item.id) === String(selectedCvId)),
    [cvDocuments, selectedCvId],
  );

  const existingAnalysis = useMemo(() => {
    if (!selectedCvId) return null;
    return history.find((item) => String(item.cv_document_id) === String(selectedCvId));
  }, [history, selectedCvId]);

  const handleStartInterview = async (analysis) => {
    setIsStartingInterview(true);
    try {
      const session = await createInterviewSession({
        sessionType: "official",
        analysisId: analysis.id,
      });
      dispatchNotice({
        tone: "success",
        title: "Phỏng vấn",
        message: "Đang chuyển hướng vào phòng phỏng vấn...",
      });
      navigate(`/phong-van/${session.id}/phong`);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Phỏng vấn",
        message: error?.message || "Không thể tạo phòng phỏng vấn.",
      });
    } finally {
      setIsStartingInterview(false);
    }
  };

  const loadCvs = async () => {
    setIsLoadingCvs(true);
    try {
      const documents = await fetchMyDocuments({ documentType: "cv" });
      const pdfDocuments = (documents || []).filter(isPdfDocument);
      setCvDocuments(pdfDocuments);
      setSelectedCvId((current) =>
        current || (pdfDocuments[0]?.id ? String(pdfDocuments[0].id) : ""),
      );
    } catch (error) {
      dispatchNotice({
        tone: "warning",
        title: "CV",
        message: error?.message || "Không thể tải danh sách CV.",
      });
    } finally {
      setIsLoadingCvs(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const page = await fetchCvJdAnalysisHistory({ pageSize: 20 });
      setHistory(page?.items || []);
      setHistoryTotal(page?.total || 0);
    } catch (error) {
      dispatchNotice({
        tone: "warning",
        title: "Lịch sử phân tích",
        message: error?.message || "Không thể tải lịch sử report.",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadCvs();
    loadHistory();
  }, []);

  const handleUpload = async () => {
    if (!(uploadFile instanceof File)) {
      setFormError("Chọn một file PDF CV trước khi tải lên.");
      return;
    }
    if (!String(uploadFile.name || "").toLowerCase().endsWith(".pdf")) {
      setFormError("Bản đầu chỉ hỗ trợ CV PDF.");
      return;
    }

    setFormError("");
    setIsUploading(true);
    try {
      const created = await uploadCvDocument({ file: uploadFile });
      setCvDocuments((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setSelectedCvId(String(created.id));
      setUploadFile(null);
      dispatchNotice({ tone: "success", title: "CV", message: "Đã tải CV lên." });
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "CV",
        message: error?.message || "Không thể tải CV lên.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    const normalizedJd = jdText.trim();
    if (!selectedCvId) {
      setFormError("Chọn hoặc tải lên một CV PDF.");
      return;
    }
    if (!normalizedJd) {
      setFormError("Nhập nội dung JD trước khi phân tích.");
      return;
    }

    setFormError("");
    setIsAnalyzing(true);
    try {
      const nextReport = await analyzeCvJd({
        cvDocumentId: selectedCvId,
        jdText: normalizedJd,
      });
      setReport(nextReport);
      await loadHistory();
    } catch (error) {
      setFormError(error?.message || "Không thể phân tích CV với JD.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openHistoryReport = async (analysisId) => {
    setLoadingReportId(analysisId);
    try {
      setReport(await fetchCvJdAnalysisDetail({ analysisId }));
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Report",
        message: error?.message || "Không thể mở report.",
      });
    } finally {
      setLoadingReportId(null);
    }
  };

  return (
    <div className={`role-workspace ${roleClass} space-y-5`}>
      <section className="role-hero">
        <div className="role-hero-content">
          <PageHeader
            eyebrow="CV/JD"
            title="So sánh CV với JD"
            meta="Phân tích độ phù hợp từ nội dung CV PDF, JD text, hard skills và kinh nghiệm."
            actions={<Badge tone="primary">{historyTotal} report đã lưu</Badge>}
          />
          <div className="role-hero-icon">
            <FileSearch size={22} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <SectionCard
          title="Tạo phân tích"
          subtitle="CV được lưu trong thư viện tài liệu của tài khoản đang chạy phân tích."
        >
          <div className="space-y-4">
            <Select
              label="CV PDF"
              value={selectedCvId}
              onChange={(event) => setSelectedCvId(event.target.value)}
              disabled={isLoadingCvs}
              hint={selectedCv ? selectedCv.file_name : "Chưa có CV PDF để chọn."}
            >
              <option value="">Chọn CV</option>
              {cvDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.file_name}
                </option>
              ))}
            </Select>

            <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <label className="mb-2 block text-sm font-bold text-[var(--color-text)]">
                Tải lên CV PDF
              </label>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="ds-input min-w-0 px-3 py-2"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                />
                <Button
                  variant="secondary"
                  icon={Upload}
                  isLoading={isUploading}
                  onClick={handleUpload}
                >
                  Tải CV
                </Button>
              </div>
            </div>

            <Textarea
              label="Nội dung JD"
              value={jdText}
              rows={12}
              onChange={(event) => setJdText(event.target.value)}
              placeholder="Nhập trách nhiệm, hard skills và yêu cầu kinh nghiệm của vị trí..."
            />

            {formError ? (
              <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </p>
            ) : null}

            {existingAnalysis ? (
              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
                  variant="primary"
                  isLoading={isStartingInterview}
                  onClick={() => handleStartInterview(existingAnalysis)}
                >
                  Vào phỏng vấn thật
                </Button>
                <Button
                  className="flex-shrink-0"
                  variant="secondary"
                  icon={RefreshCw}
                  isLoading={isAnalyzing}
                  onClick={handleAnalyze}
                  title="Phân tích lại"
                >
                  Phân tích lại
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                icon={FileSearch}
                isLoading={isAnalyzing}
                onClick={handleAnalyze}
              >
                Phân tích CV/JD
              </Button>
            )}
          </div>
        </SectionCard>

        <ReportPanel
          report={report}
          onStartInterview={handleStartInterview}
          isStartingInterview={isStartingInterview}
        />
      </div>

      <SectionCard
        title="Lịch sử phân tích"
        subtitle="Mỗi report chỉ hiển thị cho tài khoản đã chạy phân tích."
        action={
          <Button
            variant="ghost"
            icon={RefreshCw}
            disabled={isLoadingHistory}
            onClick={loadHistory}
          >
            Làm mới
          </Button>
        }
      >
        <DataTable columns={HISTORY_COLUMNS}>
          {isLoadingHistory ? (
            <DataTableState colSpan={HISTORY_COLUMNS.length}>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải report...
              </span>
            </DataTableState>
          ) : null}

          {!isLoadingHistory && history.length === 0 ? (
            <DataTableState colSpan={HISTORY_COLUMNS.length}>
              <EmptyState icon={History} title="Chưa có report đã lưu" />
            </DataTableState>
          ) : null}

          {!isLoadingHistory
            ? history.map((item) => (
                <tr key={item.id}>
                  <td className="text-[var(--color-text-muted)]">{formatDate(item.created_at)}</td>
                  <td className="font-semibold text-[var(--color-text)]">
                    {item.cv_file_name_snapshot}
                  </td>
                  <td>
                    <Badge tone={scoreTone(Number(item.overall_score || 0))}>
                      {Number(item.overall_score || 0).toFixed(2)}%
                    </Badge>
                  </td>
                  <td className="max-w-xl text-sm text-[var(--color-text-muted)]">
                    {item.executive_summary}
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={loadingReportId === item.id}
                      onClick={() => openHistoryReport(item.id)}
                    >
                      Xem
                    </Button>
                  </td>
                </tr>
              ))
            : null}
        </DataTable>
      </SectionCard>
    </div>
  );
}
