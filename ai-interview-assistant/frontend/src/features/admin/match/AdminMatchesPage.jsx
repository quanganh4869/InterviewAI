import { useEffect, useState, useMemo } from "react";
import { Loader2, FileSearch, Trash2, Mail, ExternalLink, Calendar, X, AlertCircle } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import {
  Button,
  DataTable,
  DataTableState,
  DataToolbar,
  EmptyState,
  PageHeader,
  SearchBar,
  ConfirmDialog,
  Pagination,
  Badge,
  ProgressLine,
} from "../../../components/ui";
import { authedFetch } from "../../../api/authClient";
import { dispatchNotice } from "../../../utils/notice";

const MATCH_COLUMNS = [
  { key: "id", label: "Mã Báo cáo" },
  { key: "analyst", label: "Người thực hiện" },
  { key: "cv", label: "Tên CV" },
  { key: "jd", label: "Vị trí JD" },
  { key: "score", label: "Điểm phù hợp" },
  { key: "created", label: "Ngày phân tích" },
  { key: "actions", label: "Thao tác" },
];

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN");
}

function scoreTone(score) {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

function SkillList({ items, emptyText }) {
  if (!items?.length) {
    return <p className="text-xs text-[var(--color-text-muted)] italic">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((item) => (
        <Badge key={item} tone="neutral">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Match report details modal states
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Delete states
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const data = await authedFetch(`/v1_0/admin/matches?page=${page}&page_size=${pageSize}`);
      setMatches(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Quản trị đối chiếu",
        message: error?.message || "Không thể tải danh sách kết quả đối chiếu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [page]);

  const handleViewDetails = async (analysisId) => {
    setSelectedReportId(analysisId);
    setIsLoadingDetails(true);
    setShowDetailsModal(true);
    setReportDetails(null);
    try {
      const data = await authedFetch(`/v1_0/cv-jd-analysis/${analysisId}`);
      setReportDetails(data);
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Chi tiết đối chiếu",
        message: err.message || "Không thể tải báo cáo đối chiếu chi tiết.",
      });
      setShowDetailsModal(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await authedFetch(`/v1_0/admin/matches/${reportToDelete.id}`, {
        method: "DELETE",
      });
      dispatchNotice({
        tone: "success",
        title: "Xóa báo cáo đối chiếu",
        message: `Đã xóa báo cáo đối chiếu #${reportToDelete.id} thành công.`,
      });
      setReportToDelete(null);
      loadMatches();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Xóa báo cáo đối chiếu",
        message: err.message || "Không thể xóa báo cáo đối chiếu.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMatches = useMemo(() => {
    if (!search.trim()) return matches;
    const query = search.trim().toLowerCase();
    return matches.filter(
      (item) =>
        item.id.toString().includes(query) ||
        item.analyst_name?.toLowerCase().includes(query) ||
        item.analyst_email?.toLowerCase().includes(query) ||
        item.cv_file_name_snapshot?.toLowerCase().includes(query) ||
        item.job_posting_title?.toLowerCase().includes(query)
    );
  }, [matches, search]);

  const handleSubmitSearch = (e) => {
    e.preventDefault();
    setSearch(searchDraft);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <MainLayout>
      <div className="role-workspace admin space-y-5">
        <section className="role-hero">
          <div className="role-hero-content">
            <PageHeader
              eyebrow="Admin"
              title="Quản lý kết quả đối chiếu CV & JD"
              meta="Giám sát các báo cáo so khớp kỹ năng, kinh nghiệm và điểm phù hợp giữa CV và JD của toàn bộ người dùng."
              actions={
                <div className="inline-flex items-center gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
                  <FileSearch className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Tổng số báo cáo</p>
                    <p className="text-lg font-extrabold text-[var(--color-text)]">{total}</p>
                  </div>
                </div>
              }
            />
            <div className="role-hero-icon">
              <FileSearch size={22} />
            </div>
          </div>
        </section>

        <DataToolbar>
          <form onSubmit={handleSubmitSearch} className="flex min-w-0 flex-1 gap-2">
            <SearchBar
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Tìm theo mã báo cáo, tên người thực hiện, email, CV hoặc JD..."
              className="flex-1"
            />
            <Button type="submit" size="md">
              Tìm kiếm
            </Button>
          </form>
        </DataToolbar>

        <DataTable columns={MATCH_COLUMNS}>
          {isLoading ? (
            <DataTableState colSpan={MATCH_COLUMNS.length}>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải báo cáo đối chiếu...
              </span>
            </DataTableState>
          ) : null}

          {!isLoading && filteredMatches.length === 0 ? (
            <DataTableState colSpan={MATCH_COLUMNS.length} className="p-4">
              <EmptyState title="Không tìm thấy báo cáo đối chiếu nào phù hợp" />
            </DataTableState>
          ) : null}

          {!isLoading
            ? filteredMatches.map((item) => {
                return (
                  <tr key={item.id}>
                    <td className="font-extrabold text-[var(--color-text)]">
                      #{item.id}
                    </td>
                    <td>
                      <div className="min-w-0 text-sm">
                        <p className="font-bold text-[var(--color-text)] truncate">
                          {item.analyst_name || "Chưa cập nhật"}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={12} /> {item.analyst_email}
                        </p>
                      </div>
                    </td>
                    <td className="text-sm font-semibold text-[var(--color-text)] max-w-[200px] truncate" title={item.cv_file_name_snapshot}>
                      {item.cv_file_name_snapshot}
                    </td>
                    <td className="text-sm font-semibold text-[var(--color-text)] max-w-[200px] truncate" title={item.job_posting_title || "JD Tự do"}>
                      {item.job_posting_title || <span className="italic text-[var(--color-text-soft)]">Tệp JD tải lên</span>}
                    </td>
                    <td className="font-extrabold text-sm text-[var(--color-text)]">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-[6px] text-xs font-bold ${
                          item.overall_score >= 75
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : item.overall_score >= 50
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {Math.round(item.overall_score)}%
                      </span>
                    </td>
                    <td className="text-[var(--color-text-muted)] text-xs font-semibold">
                      {formatDate(item.created_at)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] text-blue-600 transition-colors"
                          title="Xem chi tiết báo cáo"
                          onClick={() => handleViewDetails(item.id)}
                        >
                          <ExternalLink size={15} />
                        </button>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 text-[var(--color-text-muted)] transition-colors"
                          title="Xóa báo cáo đối chiếu"
                          onClick={() => setReportToDelete(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </DataTable>

        {totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Confirm delete report dialog */}
      <ConfirmDialog
        open={Boolean(reportToDelete)}
        title="Xóa báo cáo đối chiếu?"
        message={
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn xóa báo cáo đối chiếu <strong>#{reportToDelete?.id}</strong> (CV:{" "}
              <strong>{reportToDelete?.cv_file_name_snapshot}</strong>) của <strong>{reportToDelete?.analyst_email}</strong> không?
            </p>
            <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
              ⚠️ CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn báo cáo đối chiếu khỏi hệ thống dữ liệu. Các lượt phỏng vấn đã được liên kết với báo cáo này vẫn được giữ nhưng mất liên kết nguồn. Hành động này không thể hoàn tác.
            </p>
          </div>
        }
        confirmLabel="Xóa báo cáo"
        isSubmitting={isDeleting}
        onCancel={() => setReportToDelete(null)}
        onConfirm={handleDeleteReport}
      />

      {/* Match report details modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200" onClick={() => setShowDetailsModal(false)}>
          <div className="w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative my-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-[var(--color-text)] mb-6 flex items-center gap-2">
              <FileSearch className="text-blue-600" /> Chi tiết báo cáo đối chiếu #{selectedReportId}
            </h3>

            {isLoadingDetails ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">Đang tải báo cáo phân tích...</span>
              </div>
            ) : reportDetails ? (
              <div className="space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                {/* Score and summary section */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 grid gap-5 md:grid-cols-[160px_1fr] items-center">
                  <div className="grid h-32 w-32 mx-auto place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Điểm phù hợp</p>
                      <p className={`text-4xl font-extrabold mt-1 text-${scoreTone(reportDetails.overall_score)}-600`}>
                        {Math.round(reportDetails.overall_score)}%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 min-w-0">
                    <div>
                      <h4 className="text-base font-bold text-[var(--color-text)] truncate">CV: {reportDetails.cv_file_name_snapshot}</h4>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                        <Calendar size={12} /> Ngày phân tích: {formatDate(reportDetails.created_at)}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                      {reportDetails.executive_summary}
                    </p>
                  </div>
                </div>

                {/* score breakdown */}
                {reportDetails.score_breakdown && (
                  <div className="border border-[var(--color-border)] rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-sm text-[var(--color-text)] uppercase tracking-wider">Chi tiết điểm thành phần</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <ProgressLine label="Sự phù hợp ngữ nghĩa (Semantic)" value={Number(reportDetails.score_breakdown.semantic_score || 0)} />
                      <ProgressLine label="Kỹ năng chuyên môn (Hard Skills)" value={Number(reportDetails.score_breakdown.skill_score || 0)} />
                      <ProgressLine label="Kinh nghiệm làm việc (Experience)" value={Number(reportDetails.score_breakdown.experience_score || 0)} />
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs pt-2 border-t border-[var(--color-border)]">
                      {reportDetails.score_breakdown.recommendation && (
                        <Badge tone={scoreTone(reportDetails.overall_score)}>Khuyến nghị: {reportDetails.score_breakdown.recommendation}</Badge>
                      )}
                      {reportDetails.score_breakdown.confidence != null && (
                        <Badge tone="neutral">Độ tin cậy AI: {Math.round(reportDetails.score_breakdown.confidence)}%</Badge>
                      )}
                      {reportDetails.score_breakdown.semantic_method && (
                        <Badge tone="neutral">Phương thức so khớp: {reportDetails.score_breakdown.semantic_method}</Badge>
                      )}
                      {reportDetails.score_breakdown.cv_extraction?.mode && (
                        <Badge tone="neutral">Trích xuất CV: {reportDetails.score_breakdown.cv_extraction.mode}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Skill gap & Experience alignment */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="border border-[var(--color-border)] rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-sm text-[var(--color-text)] uppercase tracking-wider">Bảng kỹ năng (Skill Gap)</h4>
                    {reportDetails.skill_gap ? (
                      <div className="space-y-3.5">
                        <div>
                          <p className="text-xs font-bold text-emerald-600 uppercase">Kỹ năng trùng khớp</p>
                          <SkillList
                            items={reportDetails.skill_gap.matched_hard_skills}
                            emptyText="Không phát hiện kỹ năng trùng khớp trực tiếp."
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-600 uppercase">Kỹ năng còn thiếu</p>
                          <SkillList
                            items={reportDetails.skill_gap.missing_hard_skills}
                            emptyText="Không có kỹ năng còn thiếu nào được phát hiện."
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)]">Không có dữ liệu kỹ năng.</p>
                    )}
                  </div>

                  <div className="border border-[var(--color-border)] rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-sm text-[var(--color-text)] uppercase tracking-wider">Đánh giá kinh nghiệm</h4>
                    {reportDetails.deep_experience_alignment ? (
                      <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                        {reportDetails.deep_experience_alignment}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)]">Không có thông tin chi tiết kinh nghiệm.</p>
                    )}

                    {reportDetails.score_breakdown?.experience && (
                      <div className="flex gap-4 text-xs pt-2 border-t border-[var(--color-border)]">
                        <span className="font-semibold">CV: <span className="font-bold text-blue-600">{reportDetails.score_breakdown.experience.cv_years || 0} năm</span></span>
                        <span className="font-semibold">JD yêu cầu: <span className="font-bold text-amber-600">{reportDetails.score_breakdown.experience.jd_years || 0} năm</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {reportDetails.actionable_recommendations && reportDetails.actionable_recommendations.length > 0 && (
                  <div className="border border-[var(--color-border)] rounded-xl p-5 space-y-3">
                    <h4 className="font-bold text-sm text-[var(--color-text)] uppercase tracking-wider">Khuyến nghị hành động tiếp theo</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {reportDetails.actionable_recommendations.map((item, index) => (
                        <li key={index} className="text-sm text-[var(--color-text)] bg-[var(--color-surface-muted)] p-2.5 rounded-lg border border-[var(--color-border)] leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center p-8">
                <div className="text-center text-[var(--color-text-muted)]">
                  <AlertCircle size={32} className="mx-auto mb-2 text-rose-500" />
                  <p className="text-sm font-semibold">Không tìm thấy hoặc không thể truy cập báo cáo này.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-[var(--color-border)]">
              <Button onClick={() => setShowDetailsModal(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
