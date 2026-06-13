import { useEffect, useState, useMemo } from "react";
import { Loader2, Video, Trash2, Mail, ExternalLink, Calendar } from "lucide-react";
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
  StatusBadge,
} from "../../../components/ui";
import { authedFetch } from "../../../api/authClient";
import { dispatchNotice } from "../../../utils/notice";

const INTERVIEW_COLUMNS = [
  { key: "id", label: "Mã Session" },
  { key: "candidate", label: "Ứng viên" },
  { key: "position", label: "Vị trí" },
  { key: "cv", label: "CV sử dụng" },
  { key: "type", label: "Hình thức" },
  { key: "status", label: "Trạng thái" },
  { key: "score", label: "Điểm số" },
  { key: "created", label: "Ngày tạo" },
  { key: "actions", label: "Thao tác" },
];

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN");
}

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Delete session states
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInterviews = async () => {
    setIsLoading(true);
    try {
      const data = await authedFetch(`/v1_0/admin/interviews?page=${page}&page_size=${pageSize}`);
      setInterviews(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Quản trị phỏng vấn",
        message: error?.message || "Không thể tải danh sách phỏng vấn.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, [page]);

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await authedFetch(`/v1_0/interview-sessions/${sessionToDelete.id}`, {
        method: "DELETE",
      });
      dispatchNotice({
        tone: "success",
        title: "Xóa lượt phỏng vấn",
        message: `Đã xóa session phỏng vấn #${sessionToDelete.id} thành công.`,
      });
      setSessionToDelete(null);
      loadInterviews();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Xóa lượt phỏng vấn",
        message: err.message || "Không thể xóa session phỏng vấn.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInterviews = useMemo(() => {
    if (!search.trim()) return interviews;
    const query = search.trim().toLowerCase();
    return interviews.filter(
      (item) =>
        item.id.toString().includes(query) ||
        item.candidate_name?.toLowerCase().includes(query) ||
        item.candidate_email?.toLowerCase().includes(query) ||
        item.job_posting_title?.toLowerCase().includes(query)
    );
  }, [interviews, search]);

  const handleSubmitSearch = (e) => {
    e.preventDefault();
    setSearch(searchDraft);
  };

  const getStatusTone = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "processing":
        return "warning";
      case "pending":
        return "neutral";
      default:
        return "danger";
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "Hoàn thành";
      case "processing":
        return "Đang đánh giá";
      case "pending":
        return "Đang chờ";
      default:
        return status || "Chưa rõ";
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <MainLayout>
      <div className="role-workspace admin space-y-5">
        <section className="role-hero">
          <div className="role-hero-content">
            <PageHeader
              eyebrow="Admin"
              title="Quản lý các cuộc phỏng vấn"
              meta="Theo dõi trạng thái, xem báo cáo kết quả đánh giá năng lực ứng viên và quản trị các session phỏng vấn toàn hệ thống."
              actions={
                <div className="inline-flex items-center gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
                  <Video className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Tổng số session</p>
                    <p className="text-lg font-extrabold text-[var(--color-text)]">{total}</p>
                  </div>
                </div>
              }
            />
            <div className="role-hero-icon">
              <Video size={22} />
            </div>
          </div>
        </section>

        <DataToolbar>
          <form onSubmit={handleSubmitSearch} className="flex min-w-0 flex-1 gap-2">
            <SearchBar
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Tìm kiếm theo mã session, tên ứng viên, email hoặc vị trí..."
              className="flex-1"
            />
            <Button type="submit" size="md">
              Tìm kiếm
            </Button>
          </form>
        </DataToolbar>

        <DataTable columns={INTERVIEW_COLUMNS}>
          {isLoading ? (
            <DataTableState colSpan={INTERVIEW_COLUMNS.length}>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải danh sách phỏng vấn...
              </span>
            </DataTableState>
          ) : null}

          {!isLoading && filteredInterviews.length === 0 ? (
            <DataTableState colSpan={INTERVIEW_COLUMNS.length} className="p-4">
              <EmptyState title="Không tìm thấy lượt phỏng vấn nào phù hợp" />
            </DataTableState>
          ) : null}

          {!isLoading
            ? filteredInterviews.map((session) => {
                const isCompleted = session.status === "completed" && session.overall_score !== null;
                const isPractice = session.session_type === "practice";

                return (
                  <tr key={session.id}>
                    <td className="font-extrabold text-[var(--color-text)]">
                      #{session.id}
                    </td>
                    <td>
                      <div className="min-w-0 text-sm">
                        <p className="font-bold text-[var(--color-text)] truncate">
                          {session.candidate_name || "Chưa cập nhật"}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={12} /> {session.candidate_email}
                        </p>
                      </div>
                    </td>
                    <td className="text-sm font-semibold text-[var(--color-text)] max-w-[200px] truncate" title={session.job_posting_title || "Luyện tập tự do"}>
                      {session.job_posting_title || "Luyện tập tự do"}
                    </td>
                    <td className="text-xs text-[var(--color-text-muted)] max-w-[150px] truncate" title={session.cv_document_name || "Không dùng"}>
                      {session.cv_document_name || <span className="italic text-[var(--color-text-soft)]">Không sử dụng</span>}
                    </td>
                    <td>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[6px] ${
                          isPractice
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                      >
                        {isPractice ? "Thực hành" : "Chính thức"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={session.status === "completed" ? "active" : session.status === "processing" ? "reviewing" : "applied"} tone={getStatusTone(session.status)}>
                        {getStatusText(session.status)}
                      </StatusBadge>
                    </td>
                    <td className="font-extrabold text-sm text-[var(--color-text)]">
                      {session.overall_score !== null ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-[6px] text-xs ${
                            session.overall_score >= 75
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : session.overall_score >= 50
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          {Math.round(session.overall_score)}%
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)] font-normal">-</span>
                      )}
                    </td>
                    <td className="text-[var(--color-text-muted)] text-xs font-semibold">
                      {formatDate(session.created_at)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {isCompleted ? (
                          <button
                            type="button"
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] text-purple-600 transition-colors"
                            title="Xem báo cáo kết quả phỏng vấn"
                            onClick={() => window.open(`/phong-van/${session.id}/ket-qua`, "_blank")}
                          >
                            <ExternalLink size={15} />
                          </button>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 text-[var(--color-text-muted)] transition-colors"
                          title="Xóa session phỏng vấn"
                          onClick={() => setSessionToDelete(session)}
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

      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        title="Xóa session phỏng vấn?"
        message={
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn xóa session phỏng vấn <strong>#{sessionToDelete?.id}</strong> của ứng viên{" "}
              <strong>{sessionToDelete?.candidate_email}</strong> không?
            </p>
            <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
              ⚠️ CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn session phỏng vấn này cùng toàn bộ các câu hỏi, câu trả lời ghi âm, video và báo cáo đánh giá năng lực liên quan. Thao tác này không thể hoàn tác.
            </p>
          </div>
        }
        confirmLabel="Xóa session"
        isSubmitting={isDeleting}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
      />
    </MainLayout>
  );
}
