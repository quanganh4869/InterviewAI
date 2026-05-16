import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import "../features/aiInterview/legacy.css";
import { OverviewScreen } from "../features/aiInterview/screens/OverviewScreen";
import { JobDetailScreen } from "../features/aiInterview/screens/JobDetailScreen";
import { ProfileLibraryScreen } from "../features/aiInterview/screens/ProfileLibraryScreen";
import { InterviewHistoryScreen } from "../features/aiInterview/screens/InterviewHistoryScreen";
import { InsightsScreen } from "../features/aiInterview/screens/InsightsScreen";
import { ServicePlansScreen } from "../features/aiInterview/screens/ServicePlansScreen";
import { getStoredTheme, subscribeTheme } from "../utils/themeController";
import { getAccessToken } from "../utils/authSession";
import { useUser } from "../features/UserContext";
import {
  createDocumentDownloadUrl,
  deleteDocument,
  fetchMyDocuments,
  matchCvWithJdText,
  parseCvDocument,
  uploadCvDocument,
  uploadJdDocument,
} from "../api/documents";
import { dispatchNotice } from "../utils/notice";
import {
  CvDetailWindow,
  JdDetailWindow,
} from "../features/aiInterview/components/modals";

function toDisplayDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN");
}

function mapCvRow(doc) {
  return {
    id: doc.id,
    name: doc.file_name,
    fileName: doc.file_name,
    role: doc.metadata_json?.target_role || "N/A",
    updatedAt: toDisplayDate(doc.created_at),
    mimeType: doc.mime_type || null,
    sizeBytes: doc.size_bytes || null,
  };
}

function mapJdRow(doc) {
  return {
    id: doc.id,
    title: doc.metadata_json?.title || doc.file_name,
    company: doc.metadata_json?.company || "N/A",
    summary: doc.metadata_json?.summary || "",
    fileName: doc.file_name,
    postedAt: toDisplayDate(doc.created_at),
    mimeType: doc.mime_type || null,
    sizeBytes: doc.size_bytes || null,
  };
}

function getUploadErrorMessage(error, documentType, userRole) {
  if (error?.status === 403) {
    if (documentType === "cv") {
      return "Chỉ tài khoản USER mới được upload CV.";
    }
    if (documentType === "jd") {
      return "Chỉ tài khoản HR mới được upload JD.";
    }
  }

  if (error?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (error?.status === 413) {
    return "File quá lớn. Vui lòng chọn file nhỏ hơn.";
  }

  if (error?.status === 415) {
    return "Định dạng file không được hỗ trợ.";
  }

  if (documentType === "cv" && String(userRole || "").toLowerCase().includes("hr")) {
    return "Tài khoản HR không được upload CV.";
  }

  if (documentType === "jd" && !String(userRole || "").toLowerCase().includes("hr")) {
    return "Bạn không có quyền upload JD.";
  }

  return error?.message || "Không thể upload tài liệu.";
}

const DashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const screen = query.get("screen") || "overview";
  const [theme, setTheme] = useState(getStoredTheme);
  const { user, isLoading, fetchUser } = useUser();
  const [cvRows, setCvRows] = useState([]);
  const [jdRows, setJdRows] = useState([]);
  const [selectedCvDetail, setSelectedCvDetail] = useState(null);
  const [selectedJdDetail, setSelectedJdDetail] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(false);

  useEffect(() => subscribeTheme(setTheme), []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    if (!user && !isLoading) {
      fetchUser?.();
    }
  }, [user, isLoading, fetchUser, navigate]);

  useEffect(() => {
    if (!user?.id) return;

    const loadDocuments = async () => {
      try {
        const [cvDocs, jdDocs] = await Promise.all([
          fetchMyDocuments({ documentType: "cv" }),
          fetchMyDocuments({ documentType: "jd" }),
        ]);
        setCvRows((cvDocs || []).map(mapCvRow));
        setJdRows((jdDocs || []).map(mapJdRow));
      } catch (error) {
        dispatchNotice({
          tone: "warning",
          title: "Documents",
          message: error.message || "Không thể tải danh sách tài liệu.",
        });
      }
    };

    loadDocuments();
  }, [user?.id]);

  const handleUploadCv = async (file) => {
    if (!(file instanceof File)) {
      dispatchNotice({
        tone: "warning",
        title: "CV",
        message: "Vui lòng chọn file CV trước khi tải lên.",
      });
      return false;
    }

    try {
      dispatchNotice({
        tone: "info",
        title: "CV",
        message: "Đang tải CV lên cloud...",
      });

      const result = await uploadCvDocument({ file });
      const newRow = mapCvRow(result);
      newRow.updatedAt = "Vừa xong";
      setCvRows((prev) => [newRow, ...prev]);

      dispatchNotice({
        tone: "success",
        title: "Thành công",
        message: "Hồ sơ đã được lưu trữ trên Cloud S3.",
      });
      return true;
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Lỗi",
        message: getUploadErrorMessage(error, "cv", user?.role),
      });
      return false;
    }
  };

  const handleUploadJd = async (file) => {
    if (!(file instanceof File)) {
      dispatchNotice({
        tone: "warning",
        title: "JD",
        message: "Vui lòng chọn file JD trước khi tải lên.",
      });
      return false;
    }

    const fallbackTitle = (file.name || "JD").replace(/\.[^.]+$/, "").trim();

    try {
      dispatchNotice({
        tone: "info",
        title: "JD",
        message: "Đang tải JD lên cloud...",
      });

      const result = await uploadJdDocument({
        file,
        title: fallbackTitle || "JD",
        company: "",
        summary: "",
      });
      const newRow = mapJdRow(result);
      newRow.postedAt = "Vừa xong";
      setJdRows((prev) => [newRow, ...prev]);

      dispatchNotice({
        tone: "success",
        title: "Thành công",
        message: "JD đã được lưu trữ trên Cloud S3.",
      });
      return true;
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Lỗi",
        message: getUploadErrorMessage(error, "jd", user?.role),
      });
      return false;
    }
  };

  const handleOpenCvDetail = async (cvId, cvData) => {
    const selected = cvData || cvRows.find((item) => item.id === cvId);
    if (!selected) return;
    setSelectedCvDetail({
      ...selected,
      cvParseStatus: "loading",
      cvParseData: null,
      cvParseError: "",
    });

    const [accessResult, parseResult] = await Promise.allSettled([
      createDocumentDownloadUrl({ documentId: selected.id }),
      parseCvDocument({ documentId: selected.id }),
    ]);

    if (accessResult.status === "fulfilled") {
      const access = accessResult.value;
      setSelectedCvDetail((prev) =>
        prev?.id === selected.id ? { ...prev, cvPdf: access.download_url } : prev,
      );
    } else {
      const error = accessResult.reason;
      dispatchNotice({
        tone: "warning",
        title: "CV",
        message: error?.message || "Không thể lấy link xem CV.",
      });
    }

    if (parseResult.status === "fulfilled") {
      const parsed = parseResult.value;
      setSelectedCvDetail((prev) =>
        prev?.id === selected.id
          ? {
              ...prev,
              cvParseStatus: "success",
              cvParseData: parsed,
              cvParseError: "",
            }
          : prev,
      );
    } else {
      const error = parseResult.reason;
      setSelectedCvDetail((prev) =>
        prev?.id === selected.id
          ? {
              ...prev,
              cvParseStatus: "error",
              cvParseData: null,
              cvParseError: error?.message || "Không thể đọc dữ liệu CV.",
            }
          : prev,
      );
    }
  };
  const handleOpenJdDetail = async (jdId) => {
    const selected = jdRows.find((item) => item.id === jdId);
    if (!selected) return;
    setSelectedJdDetail(selected);

    try {
      const access = await createDocumentDownloadUrl({ documentId: selected.id });
      setSelectedJdDetail((prev) =>
        prev?.id === selected.id ? { ...prev, downloadUrl: access.download_url } : prev,
      );
    } catch (error) {
      dispatchNotice({
        tone: "warning",
        title: "JD",
        message: error.message || "Không thể lấy link xem JD.",
      });
    }
  };

  const handleDeleteCv = async (cvId) => {
    const selected = cvRows.find((item) => item.id === cvId);
    if (!selected) return;
    setDeleteConfirm({
      documentId: cvId,
      documentType: "cv",
      documentName: selected.name || selected.fileName || `CV #${cvId}`,
    });
  };

  const handleDeleteJd = async (jdId) => {
    const selected = jdRows.find((item) => item.id === jdId);
    if (!selected) return;
    setDeleteConfirm({
      documentId: jdId,
      documentType: "jd",
      documentName: selected.title || selected.fileName || `JD #${jdId}`,
    });
  };

  const handleCompareCvJd = async ({ cvDocumentId, jdText }) => {
    try {
      return await matchCvWithJdText({ cvDocumentId, jdText });
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "CV/JD Match",
        message: error?.message || "Không thể chấm điểm mức độ phù hợp CV/JD.",
      });
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm?.documentId) return;
    const { documentId, documentType } = deleteConfirm;

    try {
      setDeletingDocument(true);
      await deleteDocument({ documentId });

      if (documentType === "cv") {
        setCvRows((prev) => prev.filter((item) => item.id !== documentId));
        setSelectedCvDetail((prev) => (prev?.id === documentId ? null : prev));
      } else {
        setJdRows((prev) => prev.filter((item) => item.id !== documentId));
        setSelectedJdDetail((prev) => (prev?.id === documentId ? null : prev));
      }

      dispatchNotice({
        tone: "success",
        title: documentType.toUpperCase(),
        message: `Đã xóa ${documentType.toUpperCase()} thành công.`,
      });
      setDeleteConfirm(null);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: documentType.toUpperCase(),
        message:
          error.message ||
          `Không thể xóa ${documentType.toUpperCase()}.`,
      });
    } finally {
      setDeletingDocument(false);
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case "profileCv":
        return (
          <ProfileLibraryScreen
            userRole={user?.role}
            extraCvRows={cvRows}
            extraJdRows={jdRows}
            onUploadCv={handleUploadCv}
            onCreateJd={handleUploadJd}
            onOpenCvDetail={handleOpenCvDetail}
            onOpenCustomJdDetail={handleOpenJdDetail}
            onDeleteCv={handleDeleteCv}
            onDeleteJd={handleDeleteJd}
          />
        );
      case "jobMatch": {
        const rawJdId = query.get("jdId");
        const fallbackJd = jdRows[0] || null;
        const selectedJd =
          jdRows.find((jd) => String(jd.id) === String(rawJdId || "")) || fallbackJd;

        return (
          <JobDetailScreen
            selectedJd={selectedJd}
            cvRows={cvRows}
            jdRows={jdRows}
            onCompareCvJd={handleCompareCvJd}
            onSelectJd={(id) => navigate(`/dashboard?screen=jobMatch&jdId=${id}`)}
            onStartInterview={() => navigate("/phong-van-moi")}
          />
        );
      }
      case "interviewHistory":
        return <InterviewHistoryScreen />;
      case "insights":
        return <InsightsScreen />;
      case "servicePlans":
        return <ServicePlansScreen />;
      case "overview":
      default:
        return (
          <OverviewScreen
            onStartInterview={() => navigate("/phong-van-moi")}
            onOpenReports={() => navigate("/dashboard?screen=interviewHistory")}
          />
        );
    }
  };

  return (
    <MainLayout>
      <div
        className={`interview-legacy ${theme === "dark" ? "theme-dark" : ""} animate-in fade-in slide-in-from-bottom-4 duration-500`}
      >
        {renderScreen()}
      </div>

      {selectedCvDetail ? (
        <div
          className={`fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md ${
            theme === "dark" ? "interview-legacy theme-dark" : "interview-legacy"
          }`}
          onClick={() => setSelectedCvDetail(null)}
        >
          <CvDetailWindow
            selectedCv={selectedCvDetail}
            onClose={() => setSelectedCvDetail(null)}
          />
        </div>
      ) : null}

      {selectedJdDetail ? (
        <div
          className={`fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md ${
            theme === "dark" ? "interview-legacy theme-dark" : "interview-legacy"
          }`}
          onClick={() => setSelectedJdDetail(null)}
        >
          <JdDetailWindow
            selectedJd={selectedJdDetail}
            onClose={() => setSelectedJdDetail(null)}
          />
        </div>
      ) : null}

      {deleteConfirm ? (
        <div
          className={`fixed inset-0 z-[140] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-md ${
            theme === "dark" ? "interview-legacy theme-dark" : "interview-legacy"
          }`}
          onClick={() => (!deletingDocument ? setDeleteConfirm(null) : null)}
        >
          <section
            className={`w-full max-w-md rounded-2xl p-5 shadow-2xl ${
              theme === "dark"
                ? "border border-slate-700 bg-slate-900"
                : "border border-slate-200 bg-white"
            }`}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              className={`text-base font-bold ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Xác nhận xóa tài liệu
            </h3>
            <p
              className={`mt-2 text-sm ${
                theme === "dark" ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Bạn chắc chắn muốn xóa{" "}
              <strong>{deleteConfirm.documentName}</strong>?
            </p>
            <p
              className={`mt-1 text-xs ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Hành động này sẽ xóa cả record trong DB và file trên storage.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  theme === "dark"
                    ? "border border-slate-700 bg-slate-800 text-slate-200"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingDocument}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleConfirmDelete}
                disabled={deletingDocument}
              >
                {deletingDocument ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </MainLayout>
  );
};

export default DashboardPage;
