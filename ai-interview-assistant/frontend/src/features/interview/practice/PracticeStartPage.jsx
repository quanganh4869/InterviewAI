import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Play } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Button, SectionCard, StatusBadge } from "../../../components/ui";
import { createInterviewSession, fetchJobPostingDetail, fetchMyDocuments } from "../../../api";
import "../../aiInterview/legacy.css";

export default function PracticeStartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeCvDocumentId = searchParams.get("cvDocumentId") || "";
  const routeJobPostingId = searchParams.get("jobPostingId") || "";
  const routeTargetRole = searchParams.get("targetRole") || "";
  const routeFocus = searchParams.get("focus") || "";
  const [form, setForm] = useState({
    cv_document_id: routeCvDocumentId,
    target_role: routeTargetRole,
    focus: routeFocus || "General interview",
    language: "vi",
  });
  const [cvDocuments, setCvDocuments] = useState([]);
  const [linkedJob, setLinkedJob] = useState(null);
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);
  const [isLoadingJob, setIsLoadingJob] = useState(Boolean(routeJobPostingId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isLinkedToJob = Boolean(routeJobPostingId);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!routeJobPostingId) {
      navigate("/viec-lam", { replace: true });
    }
  }, [navigate, routeJobPostingId]);

  useEffect(() => {
    let mounted = true;
    fetchMyDocuments({ documentType: "cv" })
      .then((items) => {
        if (!mounted) return;
        const cvs = Array.isArray(items) ? items : [];
        setCvDocuments(cvs);
        setForm((current) => {
          if (current.cv_document_id) {
            const selected = cvs.find((item) => String(item.id) === String(current.cv_document_id));
            if (!selected && cvs[0]) {
              return {
                ...current,
                cv_document_id: String(cvs[0].id),
                target_role: current.target_role,
              };
            }
            return {
              ...current,
              target_role: current.target_role,
            };
          }
          if (!cvs[0]) return current;
          return {
            ...current,
            cv_document_id: String(cvs[0].id),
            target_role: current.target_role,
          };
        });
      })
      .catch((err) => setError(err?.message || "Không thể tải danh sách CV."))
      .finally(() => mounted && setIsLoadingCvs(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!routeJobPostingId) return undefined;

    let mounted = true;
    setIsLoadingJob(true);
    fetchJobPostingDetail({ postingId: routeJobPostingId })
      .then((job) => {
        if (!mounted) return;
        setLinkedJob(job || null);
        setForm((current) => ({
          ...current,
          target_role: current.target_role || job?.title || "",
        }));
      })
      .catch(() => {
        if (!mounted) return;
        setLinkedJob(null);
      })
      .finally(() => mounted && setIsLoadingJob(false));

    return () => {
      mounted = false;
    };
  }, [routeJobPostingId]);

  const start = async (event) => {
    event.preventDefault();
    if (!form.cv_document_id) {
      setError("Vui lòng chọn CV phù hợp trước khi bắt đầu luyện tập.");
      return;
    }
    if (!routeJobPostingId || !linkedJob) {
      setError("Vui lòng chọn JD trước khi bắt đầu luyện tập.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const practiceConfig = {
        target_role: linkedJob?.title || form.target_role,
        focus: form.focus,
        language: form.language,
      };
      const session = await createInterviewSession({
        sessionType: "practice",
        cvDocumentId: form.cv_document_id,
        jobPostingId: routeJobPostingId || undefined,
        practiceConfig,
      });
      navigate(`/luyen-tap/${session.id}/phong`);
    } catch (err) {
      setError(err?.message || "Không thể tạo phiên luyện tập.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="interview-legacy grid gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="role-hero">
          <div className="role-hero-content">
            <div>
              <StatusBadge status="reviewing">Luyện tập</StatusBadge>
              <h2>Tạo phiên luyện tập</h2>
              <p>Phiên luyện tập được lưu vào cơ sở dữ liệu và dùng chung bản ghi lời nói, đánh giá với phỏng vấn chính thức.</p>
            </div>
          </div>
        </header>

        <SectionCard title="Cấu hình luyện tập">
          <form className="grid gap-4" onSubmit={start}>
            {error ? (
              <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}
            <label className="grid gap-2 text-sm font-bold">
              CV dùng để sinh câu hỏi
              <select
                className="input-field"
                value={form.cv_document_id}
                onChange={(event) => {
                  const selected = cvDocuments.find((item) => String(item.id) === event.target.value);
                  setForm((current) => ({
                    ...current,
                    cv_document_id: event.target.value,
                    target_role: current.target_role || selected?.metadata_json?.target_role || "",
                  }));
                }}
                disabled={isLoadingCvs || cvDocuments.length === 0}
                required
              >
                {isLoadingCvs ? (
                  <option value="">Đang tải CV...</option>
                ) : cvDocuments.length === 0 ? (
                  <option value="">Chưa có CV. Vui lòng tải CV trước.</option>
                ) : (
                  cvDocuments.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.file_name}
                    </option>
                  ))
                )}
              </select>
            </label>
            {!isLoadingCvs && cvDocuments.length === 0 ? (
              <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-bold">Bạn cần tải CV trước khi tạo phiên luyện tập.</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-fit"
                  onClick={() => navigate("/dashboard?screen=profileCv")}
                >
                  <FileText size={16} /> Tải CV lên
                </Button>
              </div>
            ) : null}
            <label className="grid gap-2 text-sm font-bold">
              Vị trí mục tiêu
              <div className="input-field bg-[var(--color-surface-muted)] text-[var(--color-text)]">
                {isLoadingJob ? "Đang tải JD..." : linkedJob?.title || form.target_role || "JD chưa sẵn sàng"}
              </div>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Trọng tâm luyện tập
              <select
                className="input-field"
                value={form.focus}
                onChange={(event) => update("focus", event.target.value)}
              >
                <option value="General interview">Phỏng vấn tổng quát</option>
                <option value="Technical interview">Phỏng vấn kỹ thuật</option>
                <option value="Behavioral interview">Phỏng vấn hành vi</option>
                <option value="HR screening">HR screening</option>
              </select>
            </label>
            {isLinkedToJob ? (
              <div className="hidden">
                <span className="font-bold text-[var(--color-text)]">Level theo JD</span>
                <strong className="text-[var(--color-text)]">
                  {isLoadingJob ? "Đang tải JD..." : linkedJob?.level || form.level || "Theo JD"}
                </strong>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">
                  Phiên luyện tập này đang gắn với JD, nên cấp bậc được lấy từ JD thay vì chọn thủ công.
                </p>
              </div>
            ) : (
              <label className="grid gap-2 text-sm font-bold">
                Level
                <select
                  className="input-field"
                  value={form.level}
                  onChange={(event) => update("level", event.target.value)}
                >
                  <option value="Intern">Intern</option>
                  <option value="Junior">Junior</option>
                  <option value="Middle">Middle</option>
                  <option value="Senior">Senior</option>
                  <option value="General">General</option>
                </select>
              </label>
            )}
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-fit"
              disabled={isLoadingCvs || isLoadingJob || cvDocuments.length === 0}
            >
              <Play size={16} /> Bắt đầu luyện tập
            </Button>
          </form>
        </SectionCard>
      </div>
    </MainLayout>
  );
}
