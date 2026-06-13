import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import { ConfirmDialog } from "../../components/ui";
import "../aiInterview/legacy.css";
import {
  OverviewScreen,
  JobDetailScreen,
  ProfileLibraryScreen,
  CandidateReviewDetailScreen,
  InterviewHistoryScreen,
  InsightsScreen,
  ServicePlansScreen,
} from "../aiInterview/screens";
import {
  DocumentDetailOverlays,
  DocumentEditModal,
  useDocuments,
} from "../documents";
import { CvJdAnalysisScreen } from "../cvJdAnalysis";
import { AdminDashboardScreen } from "../admin";
import {
  createJobPostingFromDocument,
  fetchHrInterviewSessions,
  fetchMyInterviewSessions,
  fetchPublicJobPostings,
} from "../../api";
import { useUser } from "../UserContext";
import { getAccessToken } from "../../utils/authSession";
import { dispatchNotice } from "../../utils/notice";
import { getStoredTheme, subscribeTheme } from "../../utils/themeController";

function AdminOverview() {
  return <AdminDashboardScreen />;
}

export default function DashboardPage({ forcedScreen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const screen = forcedScreen || query.get("screen") || "overview";
  const [theme, setTheme] = useState(getStoredTheme);
  const { user, isLoading, fetchUser } = useUser();
  const normalizedRole = String(user?.role || "").toLowerCase();
  const isAdmin = normalizedRole.includes("admin");
  const isRecruiter = normalizedRole.includes("hr") || normalizedRole.includes("recruiter");
  const documents = useDocuments(user);
  const [publicJobRows, setPublicJobRows] = useState([]);
  const [myInterviewSessions, setMyInterviewSessions] = useState([]);
  const [hrInterviewSessions, setHrInterviewSessions] = useState([]);
  const [publishingJdId, setPublishingJdId] = useState(null);
  const [publicJobsError, setPublicJobsError] = useState("");

  const mapJobPostingToJdRow = (posting) => ({
    id: posting.id,
    jobPostingId: posting.id,
    title: posting.title,
    company: posting.company || "N/A",
    location: posting.location || "",
    salary: posting.salary || "",
    workType: posting.work_type || "",
    experience: posting.experience || "",
    level: posting.level || "",
    deadline: posting.deadline || "",
    description: posting.description || "",
    requirements: posting.requirements || "",
    benefits: posting.benefits || "",
    summary: [posting.description, posting.requirements, posting.benefits].filter(Boolean).join("\n\n"),
    postedAt: posting.created_at ? new Date(posting.created_at).toLocaleString("vi-VN") : "N/A",
    status: posting.status,
  });

  useEffect(() => subscribeTheme(setTheme), []);

  const loadPublicJobs = async () => {
    try {
      const page = await fetchPublicJobPostings();
      setPublicJobRows((page?.items || []).map(mapJobPostingToJdRow));
      setPublicJobsError("");
    } catch (error) {
      setPublicJobRows([]);
      setPublicJobsError(error?.message || "Không thể tải JD đã đăng.");
      dispatchNotice({
        tone: "warning",
        title: "JD công khai",
        message: error?.message || "Không thể tải danh sách JD đã đăng.",
      });
    }
  };

  const loadHrInterviews = async () => {
    if (!isRecruiter && !isAdmin) return;
    try {
      const page = await fetchHrInterviewSessions();
      setHrInterviewSessions(page?.items || []);
    } catch {
      setHrInterviewSessions([]);
    }
  };

  const loadMyInterviews = async () => {
    if (isRecruiter || isAdmin) return;
    try {
      const page = await fetchMyInterviewSessions();
      setMyInterviewSessions(page?.items || []);
    } catch {
      setMyInterviewSessions([]);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadPublicJobs();
    loadHrInterviews();
    loadMyInterviews();
  }, [user?.id, isRecruiter, isAdmin]);

  const publishJd = async (jd) => {
    if (!jd?.id) return;
    setPublishingJdId(jd.id);
    try {
      await createJobPostingFromDocument({ jdDocumentId: jd.id, publish: true });
      await loadPublicJobs();
      dispatchNotice({
        tone: "success",
        title: "JD",
        message: "Đã đăng JD cho ứng viên.",
      });
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "JD",
        message: error?.message || "Không thể đăng JD cho ứng viên.",
      });
    } finally {
      setPublishingJdId(null);
    }
  };

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

  const renderScreen = () => {
    switch (screen) {
      case "profileCv":
        return (
          <ProfileLibraryScreen
            userRole={user?.role}
            extraCvRows={documents.cvRows}
            extraJdRows={documents.jdRows}
            onUploadCv={documents.uploadCv}
            onCreateJd={documents.uploadJd}
            onOpenCvDetail={documents.openCvDetail}
            onOpenCustomJdDetail={documents.openJdDetail}
            onEditCv={documents.editCv}
            onEditJd={documents.editJd}
            onDeleteCv={documents.requestDeleteCv}
            onDeleteJd={documents.requestDeleteJd}
            onPublishJd={publishJd}
            publishingJdId={publishingJdId}
          />
        );

      case "cvJdAnalysis":
        return isRecruiter || isAdmin ? (
          <CvJdAnalysisScreen userRole={user?.role} />
        ) : (
          <OverviewScreen
            cvRows={documents.cvRows}
            jdRows={publicJobRows}
            isDocumentLoading={documents.isLoadingDocuments}
            onManageDocuments={() => navigate("/dashboard?screen=profileCv")}
            onOpenMatch={() => navigate("/viec-lam")}
            onStartInterview={() => navigate("/luyen-tap/tao-moi")}
            onOpenReports={() => navigate("/dashboard?screen=interviewHistory")}
            onOpenCandidates={() => navigate("/dashboard?screen=insights")}
            realSessions={isRecruiter ? hrInterviewSessions : myInterviewSessions}
          />
        );

      case "jobMatch": {
        if (!isRecruiter && !isAdmin) {
          return <Navigate to="/viec-lam" replace />;
        }
        if (isRecruiter && !isAdmin) {
          return <InsightsScreen />;
        }

        const visibleJdRows = isAdmin ? documents.jdRows : publicJobRows;
        const rawJdId = query.get("jdId");
        const selectedJd = rawJdId
          ? visibleJdRows.find((jd) => String(jd.id) === String(rawJdId)) || null
          : isAdmin
            ? documents.jdRows[0] || null
            : null;

        return (
          <JobDetailScreen
            userRole={user?.role}
            selectedJd={selectedJd}
            cvRows={documents.cvRows}
            jdRows={visibleJdRows}
            onCompareCvJd={documents.compareCvJd}
            onSelectJd={(id) =>
              navigate(isAdmin ? `/admin/match?jdId=${id}` : `/dashboard?screen=jobMatch&jdId=${id}`)
            }
            onBackToJobList={() => navigate("/dashboard?screen=jobMatch")}
            onStartInterview={({ cvId } = {}) =>
              navigate(
                `/phong-van-moi?jobPostingId=${selectedJd?.jobPostingId || selectedJd?.id || ""}&cvDocumentId=${cvId || ""}`,
              )
            }
            publicJobsError={publicJobsError}
            managementOnly={isAdmin}
          />
        );
      }

      case "interviewHistory":
        return isAdmin ? (
          <AdminOverview navigate={navigate} documents={documents} />
        ) : (
          <InterviewHistoryScreen realSessions={isRecruiter ? hrInterviewSessions : myInterviewSessions} />
        );

      case "insights":
        return (
          <InsightsScreen
            hrInterviewSessions={hrInterviewSessions}
            jdRows={isAdmin ? documents.jdRows : (isRecruiter ? documents.jdRows : publicJobRows)}
            isAdmin={isAdmin}
          />
        );

      case "candidateDetail":
        return (
          <CandidateReviewDetailScreen
            hrInterviewSessions={hrInterviewSessions}
            isAdmin={isAdmin}
          />
        );

      case "servicePlans":
        return isAdmin ? <AdminOverview navigate={navigate} documents={documents} /> : <ServicePlansScreen />;

      case "overview":
      default:
        return isAdmin ? (
          <AdminOverview navigate={navigate} documents={documents} />
        ) : (
          <OverviewScreen
            cvRows={documents.cvRows}
            jdRows={isRecruiter ? documents.jdRows : publicJobRows}
            isDocumentLoading={documents.isLoadingDocuments}
            onManageDocuments={() => navigate("/dashboard?screen=profileCv")}
            onOpenMatch={() => navigate(isRecruiter ? "/dashboard?screen=jobMatch" : "/viec-lam")}
            onStartInterview={() => navigate("/luyen-tap/tao-moi")}
            onOpenReports={() => navigate("/dashboard?screen=interviewHistory")}
            onOpenCandidates={() => navigate("/dashboard?screen=insights")}
            realSessions={isRecruiter ? hrInterviewSessions : myInterviewSessions}
          />
        );
    }
  };

  return (
    <MainLayout>
      <div
        className={`interview-legacy ${
          theme === "dark" ? "theme-dark" : ""
        } animate-in fade-in slide-in-from-bottom-4 duration-500`}
      >
        {renderScreen()}
      </div>

      <DocumentDetailOverlays
        selectedCvDetail={documents.selectedCvDetail}
        selectedJdDetail={documents.selectedJdDetail}
        onCloseCv={() => documents.setSelectedCvDetail(null)}
        onCloseJd={() => documents.setSelectedJdDetail(null)}
      />

      <DocumentEditModal
        editDocument={documents.editDocument}
        savingDocument={documents.savingDocument}
        onChange={documents.setEditDocument}
        onClose={() => documents.setEditDocument(null)}
        onSave={documents.saveDocumentEdit}
      />

      <ConfirmDialog
        open={Boolean(documents.deleteConfirm)}
        title="Xóa tài liệu?"
        message={documents.deleteConfirm?.documentName}
        confirmLabel="Xóa"
        isSubmitting={documents.deletingDocument}
        onCancel={() => documents.setDeleteConfirm(null)}
        onConfirm={documents.confirmDelete}
      />
    </MainLayout>
  );
}
