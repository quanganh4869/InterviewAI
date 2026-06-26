import { useEffect, useState, useMemo } from "react";
import { Loader2, FolderKanban, Trash2, X, Download, FileText, Briefcase, Mail, User, ShieldCheck } from "lucide-react";
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
} from "../../../components/ui";
import { createDocumentDownloadUrl } from "../../../api";
import { authedFetch } from "../../../api/authClient";
import { dispatchNotice } from "../../../utils/notice";
import { CvDetailWindow, JdDetailWindow } from "../../aiInterview/components/modals";

const DOCUMENT_COLUMNS = [
  { key: "name", label: "Tên tài liệu" },
  { key: "owner", label: "Chủ sở hữu" },
  { key: "type", label: "Loại" },
  { key: "mime", label: "Định dạng" },
  { key: "size", label: "Dung lượng" },
  { key: "created", label: "Ngày tải lên" },
  { key: "actions", label: "Thao tác" },
];

function formatSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "N/A";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN");
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [activeTab, setActiveTab] = useState("all"); // "all", "cv", "jd"
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal States
  const [selectedCvDetail, setSelectedCvDetail] = useState(null);
  const [selectedJdDetail, setSelectedJdDetail] = useState(null);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showJdModal, setShowJdModal] = useState(false);

  // Delete State
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await authedFetch(`/v1_0/admin/documents?page=${page}&page_size=${pageSize}`);
      setDocuments(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Quản trị tài liệu",
        message: error?.message || "Không thể tải danh sách tài liệu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [page]);

  const handleDownloadDoc = async (docId) => {
    try {
      const res = await createDocumentDownloadUrl({ documentId: docId });
      if (res?.download_url) {
        window.open(res.download_url, "_blank");
      } else {
        throw new Error("Không lấy được URL tải tài liệu.");
      }
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Tải tài liệu",
        message: err.message || "Không thể lấy liên kết tải tài liệu.",
      });
    }
  };

  const handleViewDetails = async (doc) => {
    const isCv = doc.document_type?.toLowerCase() === "cv";
    if (isCv) {
      setSelectedCvDetail({
        id: doc.id,
        name: doc.file_name,
        fileName: doc.file_name,
        role: doc.metadata_json?.target_role || "N/A",
        mimeType: doc.mime_type,
        sizeBytes: doc.size_bytes,
        updatedAt: formatDate(doc.created_at),
        cvParseStatus: "loading",
        cvParseData: null,
        cvParseError: "",
      });
      setShowCvModal(true);
      try {
        // Fetch download link
        const access = await createDocumentDownloadUrl({ documentId: doc.id });
        setSelectedCvDetail(prev => prev?.id === doc.id ? { ...prev, cvPdf: access?.download_url } : prev);

        // Fetch parse data
        const parsed = await authedFetch(`/v1_0/document/${doc.id}/cv-parse`, {
          method: "GET",
        });
        setSelectedCvDetail(prev => prev?.id === doc.id ? { ...prev, cvParseStatus: "success", cvParseData: parsed } : prev);
      } catch (err) {
        setSelectedCvDetail(prev => prev?.id === doc.id ? { ...prev, cvParseStatus: "error", cvParseError: err.message || "Không thể đọc thông tin phân tích." } : prev);
      }
    } else {
      setSelectedJdDetail({
        id: doc.id,
        title: doc.metadata_json?.title || doc.file_name,
        fileName: doc.file_name,
        company: doc.metadata_json?.company || "N/A",
        postedAt: formatDate(doc.created_at),
        mimeType: doc.mime_type,
        sizeBytes: doc.size_bytes,
        summary: doc.metadata_json?.summary || doc.metadata_json?.description || "",
      });
      setShowJdModal(true);
      try {
        const access = await createDocumentDownloadUrl({ documentId: doc.id });
        setSelectedJdDetail(prev => prev?.id === doc.id ? { ...prev, downloadUrl: access?.download_url } : prev);
      } catch (err) {
        dispatchNotice({
          tone: "warning",
          title: "Xem JD",
          message: err.message || "Không thể lấy liên kết tải JD.",
        });
      }
    }
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await authedFetch(`/v1_0/document/${docToDelete.id}`, {
        method: "DELETE",
      });
      dispatchNotice({
        tone: "success",
        title: "Xóa tài liệu",
        message: `Đã xóa tài liệu "${docToDelete.file_name}" thành công.`,
      });
      setDocToDelete(null);
      loadDocuments();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Xóa tài liệu",
        message: err.message || "Không thể xóa tài liệu.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    let result = documents;

    // Filter by type tab
    if (activeTab === "cv") {
      result = result.filter(d => d.document_type?.toLowerCase() === "cv");
    } else if (activeTab === "jd") {
      result = result.filter(d => d.document_type?.toLowerCase() === "jd");
    }

    // Filter by search query
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        d =>
          d.file_name?.toLowerCase().includes(query) ||
          d.owner_name?.toLowerCase().includes(query) ||
          d.owner_email?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [documents, activeTab, search]);

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
              title="Quản lý CV & JD"
              meta="Giám sát, xem nội dung bóc tách và xóa các tài liệu CV/JD của toàn bộ người dùng trong hệ thống."
              actions={
                <div className="inline-flex items-center gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
                  <FolderKanban className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Tổng số tài liệu</p>
                    <p className="text-lg font-extrabold text-[var(--color-text)]">{total}</p>
                  </div>
                </div>
              }
            />
            <div className="role-hero-icon">
              <FolderKanban size={22} />
            </div>
          </div>
        </section>

        {/* Tab Filters */}
        <div className="flex border-b border-[var(--color-border)] gap-6">
          <button
            type="button"
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 px-1 ${
              activeTab === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            onClick={() => setActiveTab("all")}
          >
            Tất cả tài liệu
          </button>
          <button
            type="button"
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 px-1 ${
              activeTab === "cv"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            onClick={() => setActiveTab("cv")}
          >
            Danh sách CV
          </button>
          <button
            type="button"
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 px-1 ${
              activeTab === "jd"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            onClick={() => setActiveTab("jd")}
          >
            Danh sách JD
          </button>
        </div>

        <DataToolbar>
          <form onSubmit={handleSubmitSearch} className="flex min-w-0 flex-1 gap-2">
            <SearchBar
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Tìm theo tên file, tên hoặc email chủ sở hữu..."
              className="flex-1"
            />
            <Button type="submit" size="md">
              Tìm kiếm
            </Button>
          </form>
        </DataToolbar>

        <DataTable columns={DOCUMENT_COLUMNS}>
          {isLoading ? (
            <DataTableState colSpan={DOCUMENT_COLUMNS.length}>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải danh sách tài liệu...
              </span>
            </DataTableState>
          ) : null}

          {!isLoading && filteredDocuments.length === 0 ? (
            <DataTableState colSpan={DOCUMENT_COLUMNS.length} className="p-4">
              <EmptyState title="Không tìm thấy tài liệu nào phù hợp" />
            </DataTableState>
          ) : null}

          {!isLoading
            ? filteredDocuments.map((doc) => {
                const isCv = doc.document_type?.toLowerCase() === "cv";
                return (
                  <tr key={doc.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-[10px] ${
                            isCv ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          } text-sm font-bold`}
                        >
                          {isCv ? <FileText size={16} /> : <Briefcase size={16} />}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(doc)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left truncate max-w-[280px]"
                            title="Xem chi tiết nội dung bóc tách"
                          >
                            {doc.file_name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="min-w-0 text-sm">
                        <p className="font-bold text-[var(--color-text)] truncate">
                          {doc.owner_name || "Chưa cập nhật"}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={12} /> {doc.owner_email}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-[6px] border ${
                          isCv
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {doc.document_type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-[var(--color-text-muted)] text-xs font-semibold">
                      {doc.mime_type || "N/A"}
                    </td>
                    <td className="text-[var(--color-text-muted)] text-xs font-semibold">
                      {formatSize(doc.size_bytes)}
                    </td>
                    <td className="text-[var(--color-text-muted)] text-xs font-semibold">
                      {formatDate(doc.created_at)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] text-blue-600 transition-colors"
                          title="Tải tệp gốc"
                          onClick={() => handleDownloadDoc(doc.id)}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 text-[var(--color-text-muted)] transition-colors"
                          title="Xóa tài liệu"
                          onClick={() => setDocToDelete(doc)}
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

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={Boolean(docToDelete)}
        title="Xóa tài liệu hệ thống?"
        message={
          <div className="space-y-2">
            <p>
              Bạn có chắc chắn muốn xóa tài liệu <strong>{docToDelete?.file_name}</strong> của người dùng{" "}
              <strong>{docToDelete?.owner_email}</strong> không?
            </p>
            <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
              ⚠️ CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn tài liệu khỏi hệ thống dữ liệu. Các lượt đối chiếu so sánh hoặc session phỏng vấn liên quan có thể bị ảnh hưởng.
            </p>
          </div>
        }
        confirmLabel="Xóa tài liệu"
        isSubmitting={isDeleting}
        onCancel={() => setDocToDelete(null)}
        onConfirm={handleDeleteDoc}
      />

      {/* Detail Modals using shared components */}
      {showCvModal && selectedCvDetail && (
        <div
          className="interview-legacy fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowCvModal(false)}
        >
          <CvDetailWindow selectedCv={selectedCvDetail} onClose={() => setShowCvModal(false)} />
        </div>
      )}

      {showJdModal && selectedJdDetail && (
        <div
          className="interview-legacy fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowJdModal(false)}
        >
          <JdDetailWindow selectedJd={selectedJdDetail} onClose={() => setShowJdModal(false)} />
        </div>
      )}
    </MainLayout>
  );
}
