import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import FaqPage from "./pages/FaqPage";
import AdminDocumentsPage from "./pages/AdminDocumentsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminInterviewsPage from "./pages/AdminInterviewsPage";
import AdminMatchesPage from "./pages/AdminMatchesPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewResultPage from "./pages/InterviewResultPage";
import InterviewSessionDetailPage from "./pages/InterviewSessionDetailPage";
import InterviewWizardPage from "./pages/InterviewWizardPage";
import InterviewComparisonPage from "./pages/InterviewComparisonPage";

import {
  CandidateJobComparePage,
  CandidateJobDetailPage,
  CandidateJobsPage,
  CvJdReportPage,
} from "./features/candidateJobs/CandidateJobPages";
import InterviewSessionRoomPage from "./features/interview/session/InterviewSessionRoomPage";
import PracticeStartPage from "./features/interview/practice/PracticeStartPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import PricingPage from "./pages/PricingPage";
import ProductPage from "./pages/ProductPage";
import UserProfilePage from "./pages/UserProfilePage";
import { UserProvider, useUser } from "./features/UserContext";
import { NoticeModal } from "./components/ui";
import {
  getAccessToken,
  getAuthUser,
  getRoleHomePath,
  isOnboardingDone,
  normalizeUserRole,
} from "./utils/authSession";
import { getStoredTheme, subscribeTheme } from "./utils/themeController";

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

function GlobalThemeScope() {
  const location = useLocation();
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => subscribeTheme(setTheme), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const darkEnabled = theme === "dark";
    document.documentElement.classList.toggle("app-theme-dark", darkEnabled);
    document.body.classList.toggle("app-theme-dark", darkEnabled);
  }, [location.pathname, theme]);

  return null;
}

function RootEntryPage() {
  const hasAccessToken = Boolean(getAccessToken());
  const storedUser = getAuthUser();
  const storedRole = normalizeUserRole(storedUser?.role);
  if (hasAccessToken && storedRole === "admin") {
    return <Navigate to={getRoleHomePath(storedRole)} replace />;
  }
  if (hasAccessToken && !isOnboardingDone()) {
    return <Navigate to="/onboarding" replace />;
  }
  if (hasAccessToken && isOnboardingDone()) {
    return <Navigate to={getRoleHomePath(storedRole)} replace />;
  }
  return <LandingPage />;
}

function RouteLoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4">
      <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)] shadow-sm">
        Đang kiểm tra phiên đăng nhập...
      </div>
    </main>
  );
}

function RequireAuth({ children, allowedRoles }) {
  const { user, isLoading, fetchUser } = useUser();
  const token = getAccessToken();

  useEffect(() => {
    if (token && !user && !isLoading) {
      fetchUser?.();
    }
  }, [token, user, isLoading, fetchUser]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading || !user) {
    return <RouteLoadingState />;
  }

  const role = normalizeUserRole(user.role);
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  return children;
}

export default function App() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {};
      setNotice({
        tone: detail.tone || "info",
        title: detail.title || "",
        message: detail.message || "",
      });
    };
    window.addEventListener("aiia:notice", handler);
    return () => window.removeEventListener("aiia:notice", handler);
  }, []);

  return (
    <BrowserRouter>
      <UserProvider>
        <ScrollToTop />
        <GlobalThemeScope />
        <Routes>
          <Route path="/" element={<RootEntryPage />} />
          <Route
            path="/admin/users"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminUsersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminDocumentsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/interviews"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminInterviewsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/matches"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminMatchesPage />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/viec-lam"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <CandidateJobsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/viec-lam/:jobPostingId"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <CandidateJobDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/viec-lam/:jobPostingId/so-sanh-cv"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <CandidateJobComparePage />
              </RequireAuth>
            }
          />
          <Route
            path="/bao-cao-cv-jd/:analysisId"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <CvJdReportPage />
              </RequireAuth>
            }
          />
          <Route
            path="/phong-van/so-sanh"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <InterviewComparisonPage />
              </RequireAuth>
            }
          />
          <Route
            path="/phong-van/:sessionId/phong"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <InterviewSessionRoomPage />
              </RequireAuth>
            }
          />

          <Route
            path="/phong-van/:sessionId/ket-qua"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <InterviewResultPage />
              </RequireAuth>
            }
          />
          <Route
            path="/phong-van/:sessionId/chi-tiet"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <InterviewSessionDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/luyen-tap/tao-moi"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <PracticeStartPage />
              </RequireAuth>
            }
          />
          <Route
            path="/luyen-tap/:sessionId/phong"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <InterviewSessionRoomPage />
              </RequireAuth>
            }
          />
          <Route
            path="/luyen-tap/:sessionId/ket-qua"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <InterviewResultPage />
              </RequireAuth>
            }
          />
          <Route
            path="/luyen-tap/:sessionId/chi-tiet"
            element={
              <RequireAuth allowedRoles={["user", "admin"]}>
                <InterviewSessionDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/candidates/:candidateId"
            element={
              <RequireAuth allowedRoles={["hr"]}>
                <DashboardPage forcedScreen="candidateDetail" />
              </RequireAuth>
            }
          />
          <Route
            path="/phong-van-moi"
            element={
              <RequireAuth allowedRoles={["user", "hr"]}>
                <InterviewWizardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/ket-qua-phong-van"
            element={
              <RequireAuth allowedRoles={["user", "hr"]}>
                <InterviewResultPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chi-tiet-phong-van"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <InterviewSessionDetailPage />
              </RequireAuth>
            }
          />
          <Route path="/interview" element={<Navigate to="/dashboard" replace />} />
          <Route path="/san-pham" element={<ProductPage />} />
          <Route path="/bang-gia" element={<PricingPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/google-callback" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/thong-tin-nguoi-dung"
            element={
              <RequireAuth allowedRoles={["user", "hr", "admin"]}>
                <UserProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <NoticeModal
          isOpen={Boolean(notice)}
          tone={notice?.tone}
          title={notice?.title}
          message={notice?.message}
          onClose={() => setNotice(null)}
        />
      </UserProvider>
    </BrowserRouter>
  );
}
