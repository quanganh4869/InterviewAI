import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { fetchAdminUsers } from "../../../api";
import { Button, EmptyState, StatusBadge } from "../../../components/ui";
import {
  ActivityList,
  AIInsightCard,
  ChartCard,
  DashboardHeader,
  DashboardLoadingState,
  DashboardSection,
  ProgressCard,
  QuickActionCard,
  RecentTable,
  StatCard,
  WelcomeBanner,
} from "../../dashboard/components/DashboardComponents";
import { dispatchNotice } from "../../../utils/notice";
import { useUser } from "../../UserContext";
import { HISTORY_DATA } from "../data/mockData";

const ADMIN_USER_COLUMNS = [
  {
    key: "user",
    label: "Người dùng",
    render: (row) => (
      <div>
        <strong className="dashboard-table-primary">{row.name || "Chưa cập nhật"}</strong>
        <span className="dashboard-table-secondary">{row.email || "Không có email"}</span>
      </div>
    ),
  },
  {
    key: "role",
    label: "Role",
    render: (row) => <StatusBadge status={row.role || "user"}>{row.role || "user"}</StatusBadge>,
  },
  {
    key: "plan",
    label: "Gói",
    render: (row) => row.plan_name || (row.plan_id ? `#${row.plan_id}` : "Chưa có"),
  },
];

const HR_CANDIDATE_COLUMNS = [
  {
    key: "candidate",
    label: "Ứng viên",
    render: (row) => (
      <div>
        <strong className="dashboard-table-primary">{row.name || row.fileName || "CV"}</strong>
        <span className="dashboard-table-secondary">{row.updatedAt || "Mới cập nhật"}</span>
      </div>
    ),
  },
  {
    key: "position",
    label: "Vị trí",
    render: (row) => row.role && row.role !== "N/A" ? row.role : "Chưa gắn vị trí",
  },
  {
    key: "status",
    label: "Trạng thái",
    render: () => <StatusBadge status="reviewing">Review</StatusBadge>,
  },
  {
    key: "score",
    label: "AI score",
    render: () => "--",
  },
];

const HR_JOB_COLUMNS = [
  {
    key: "job",
    label: "Tin tuyển dụng",
    render: (row) => (
      <div>
        <strong className="dashboard-table-primary">{row.title || row.fileName || "JD"}</strong>
        <span className="dashboard-table-secondary">{row.company || "Chưa có công ty"}</span>
      </div>
    ),
  },
  {
    key: "posted",
    label: "Cập nhật",
    render: (row) => row.postedAt || "N/A",
  },
  {
    key: "status",
    label: "Trạng thái",
    render: () => <StatusBadge status="active">Active</StatusBadge>,
  },
];

function getProfileCompletion(cvCount) {
  return cvCount > 0 ? 72 : 34;
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function DashboardBars({ items }) {
  const maxValue = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return (
    <div className="dashboard-bars">
      {items.map((item) => {
        const value = Number(item.value) || 0;
        const width = value ? Math.max(12, Math.round((value / maxValue) * 100)) : 0;
        return (
          <div key={item.label} className="dashboard-bar-row">
            <span>{item.label}</span>
            <div>
              <i className={`dashboard-tone-${item.tone || "primary"}`.trim()} style={{ width: `${width}%` }} />
            </div>
            <strong>{item.displayValue ?? value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function PipelineBoard({ items }) {
  return (
    <div className="dashboard-pipeline-board">
      {items.map((item) => (
        <article key={item.label} className={`dashboard-pipeline-stage dashboard-tone-${item.tone || "primary"}`.trim()}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.helper}</small>
        </article>
      ))}
    </div>
  );
}

function useAdminDashboardSummary(enabled) {
  const [summary, setSummary] = useState({
    totalUsers: 0,
    hrUsers: 0,
    candidateUsers: 0,
    adminUsers: 0,
    recentUsers: [],
    isLoading: enabled,
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const loadSummary = async () => {
      setSummary((current) => ({ ...current, isLoading: true }));
      try {
        const [allUsers, hrUsers, candidateUsers, adminUsers] = await Promise.all([
          fetchAdminUsers({ page: 1, pageSize: 5 }),
          fetchAdminUsers({ role: "HR", page: 1, pageSize: 1 }),
          fetchAdminUsers({ role: "user", page: 1, pageSize: 1 }),
          fetchAdminUsers({ role: "admin", page: 1, pageSize: 1 }),
        ]);

        if (cancelled) return;
        setSummary({
          totalUsers: allUsers?.total || 0,
          hrUsers: hrUsers?.total || 0,
          candidateUsers: candidateUsers?.total || 0,
          adminUsers: adminUsers?.total || 0,
          recentUsers: allUsers?.items || [],
          isLoading: false,
        });
      } catch (error) {
        if (cancelled) return;
        setSummary((current) => ({ ...current, isLoading: false }));
        dispatchNotice({
          tone: error?.status === 403 ? "danger" : "warning",
          title: "Dashboard",
          message: error?.message || "Không thể tải tổng quan người dùng.",
        });
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return summary;
}

function AdminDashboard({
  onManageUsers,
  onManageDocuments,
  onOpenMatch,
  cvRows,
  jdRows,
  isDocumentLoading,
}) {
  const adminSummary = useAdminDashboardSummary(true);
  const recentActivities = useMemo(
    () => [
      ...adminSummary.recentUsers.slice(0, 2).map((item) => ({
        id: `user-${item.id}`,
        title: item.name || item.email || "Tài khoản mới",
        description: `Role ${item.role || "user"} đã có trong user directory.`,
        meta: item.plan_name || "Account",
        icon: UsersRound,
        tone: "primary",
      })),
      ...jdRows.slice(0, 2).map((item) => ({
        id: `jd-${item.id}`,
        title: item.title || item.fileName || "JD mới",
        description: `${item.company || "Chưa có công ty"} sẵn sàng cho matching.`,
        meta: item.postedAt,
        icon: BriefcaseBusiness,
        tone: "success",
      })),
      ...cvRows.slice(0, 1).map((item) => ({
        id: `cv-${item.id}`,
        title: item.name || item.fileName || "CV mới",
        description: "Hồ sơ ứng viên đã vào kho tài liệu.",
        meta: item.updatedAt,
        icon: FileText,
        tone: "warning",
      })),
    ],
    [adminSummary.recentUsers, cvRows, jdRows],
  );

  return (
    <div className="role-workspace admin dashboard-workspace">
      <DashboardHeader
        eyebrow="Không gian Quản trị"
        title="Tổng quan Hệ thống"
        description="Quản lý người dùng, nhà tuyển dụng, tài liệu tuyển dụng và luồng AI matching từ một màn hình tổng quan."
      />

      <WelcomeBanner
        eyebrow="Hoạt động hệ thống"
        title="Hệ thống hoạt động ổn định"
        description="Danh bạ người dùng và kho tài liệu CV/JD là nguồn dữ liệu chính của bảng điều khiển để theo dõi tiến trình."
        icon={ShieldCheck}
        status={{ status: "active", tone: "success", label: "Hoạt động ổn định" }}
        actions={
          <>
            <Button variant="primary" onClick={onManageUsers}>
              <UsersRound size={16} /> Quản lý Người dùng
            </Button>
            <Button variant="secondary" onClick={onManageDocuments}>
              <FileText size={16} /> Duyệt Tài liệu
            </Button>
          </>
        }
        aside={
          <div className="dashboard-banner-metrics">
            <span>
              <strong>{jdRows.length}</strong>
              JD hoạt động
            </span>
            <span>
              <strong>{cvRows.length}</strong>
              Hồ sơ CV
            </span>
          </div>
        }
      />

      <DashboardSection title="Chỉ số nhanh" description="Nhìn nhanh quy mô hệ thống và dữ liệu tuyển dụng sẵn sàng xử lý.">
        <div className="dashboard-stat-grid">
          <StatCard label="Tổng người dùng" value={adminSummary.totalUsers} helper="Dữ liệu hệ thống" icon={UsersRound} loading={adminSummary.isLoading} />
          <StatCard label="Nhà tuyển dụng / HR" value={adminSummary.hrUsers} helper="Tài khoản HR" icon={UserRound} tone="success" loading={adminSummary.isLoading} />
          <StatCard label="Tổng tin tuyển dụng" value={jdRows.length} helper="JD trong kho hiện tại" icon={BriefcaseBusiness} tone="info" loading={isDocumentLoading} />
          <StatCard label="Hồ sơ ứng viên" value={cvRows.length} helper="Dữ liệu hồ sơ" icon={FileText} tone="warning" loading={isDocumentLoading} />
          <StatCard label="Báo cáo phỏng vấn" value={HISTORY_DATA.length} helper="Nguồn history hiện có" icon={History} tone="primary" />
          <StatCard label="Yêu cầu chờ duyệt" value="0" helper="Danh sách chờ duyệt" icon={ClipboardCheck} tone="neutral" />
        </div>
      </DashboardSection>

      <div className="dashboard-main-grid">
        <DashboardSection title="Thống kê" description="Tổng quan vận hành từ dữ liệu đang có trong hệ thống.">
          <div className="dashboard-chart-grid">
            <ChartCard
              title="Phân bổ người dùng"
              subtitle="Tỷ lệ phân bổ vai trò người dùng trong hệ thống."
            >
              <DashboardBars
                items={[
                  { label: "Ứng viên", value: adminSummary.candidateUsers, tone: "primary" },
                  { label: "Tuyển dụng", value: adminSummary.hrUsers, tone: "success" },
                  { label: "Quản trị", value: adminSummary.adminUsers, tone: "warning" },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Hoạt động tuyển dụng"
              subtitle="Số lượng tin tuyển dụng, CV và báo cáo phỏng vấn hiện tại."
            >
              <DashboardBars
                items={[
                  { label: "JD tuyển dụng", value: jdRows.length, tone: "info" },
                  { label: "Kho CV", value: cvRows.length, tone: "success" },
                  { label: "Báo cáo", value: HISTORY_DATA.length, tone: "primary" },
                ]}
              />
            </ChartCard>
          </div>
        </DashboardSection>

        <AIInsightCard
          eyebrow="Nhận định hệ thống"
          title="Hệ thống hoạt động tốt"
          score={jdRows.length + cvRows.length}
          summary="Kho dữ liệu sẵn sàng cho việc đối chiếu năng lực ứng viên và đánh giá."
          items={[
            { label: "Tài khoản HR", value: adminSummary.isLoading ? "..." : adminSummary.hrUsers },
            { label: "Kho JD đối chiếu", value: jdRows.length },
          ]}
          action={
            <Button variant="secondary" onClick={onOpenMatch}>
              <Target size={16} /> Xem đối chiếu
            </Button>
          }
        />
      </div>

      <div className="dashboard-two-column-grid">
        <ChartCard title="Recent activity" subtitle="Đăng ký, tài liệu mới và tín hiệu tuyển dụng gần đây.">
          <ActivityList
            items={recentActivities}
            emptyTitle="Chưa có hoạt động gần đây"
            emptyDescription="Hoạt động mới sẽ xuất hiện khi user hoặc tài liệu được tạo."
            emptyIcon={History}
          />
        </ChartCard>

        <ChartCard title="Recent users" subtitle="Danh sách tài khoản gần nhất từ user directory.">
          <RecentTable
            columns={ADMIN_USER_COLUMNS}
            rows={adminSummary.recentUsers}
            emptyState={
              <EmptyState
                icon={UsersRound}
                title={adminSummary.isLoading ? "Đang tải người dùng" : "Chưa có người dùng"}
                description="Danh sách gần đây sẽ hiển thị khi API trả về user directory."
                className="py-7"
              />
            }
          />
        </ChartCard>
      </div>

      <DashboardSection title="Quick actions" description="Đi thẳng vào các tác vụ quản trị thường dùng.">
        <div className="dashboard-quick-grid">
          <QuickActionCard title="Manage Users" description="Phân quyền và kiểm tra gói." icon={UsersRound} onClick={onManageUsers} />
          <QuickActionCard title="Review HR Accounts" description="Kiểm tra tài khoản tuyển dụng." icon={ShieldCheck} onClick={onManageUsers} tone="success" />
          <QuickActionCard title="Manage Jobs" description="Duyệt và cập nhật JD." icon={BriefcaseBusiness} onClick={onManageDocuments} tone="info" />
          <QuickActionCard title="View Reports" description="Mở luồng matching CV/JD." icon={BarChart3} onClick={onOpenMatch} tone="warning" />
        </div>
      </DashboardSection>
    </div>
  );
}

function RecruiterDashboard({
  onManageDocuments,
  onOpenCandidates,
  onOpenReports,
  onStartInterview,
  cvRows,
  jdRows,
  isDocumentLoading,
  realSessions = [],
}) {
  const candidateCount = cvRows.length;
  const reviewReadyCount = Math.min(candidateCount, jdRows.length);

  return (
    <div className="role-workspace hr dashboard-workspace">
      <DashboardHeader
        eyebrow="Không gian tuyển dụng"
        title="Bảng điều khiển tuyển dụng"
        description="Theo dõi tin tuyển dụng, hồ sơ ứng viên và điểm rơi cần review bằng AI."
      />

      <WelcomeBanner
        eyebrow="Tình hình tuyển dụng"
        title="Duyệt ứng viên được AI đề cử"
        description="Ưu tiên JD đang mở, hàng chờ review và kết quả phỏng vấn trước khi chuyển ứng viên sang bước tiếp theo."
        icon={UsersRound}
        status={{ status: jdRows.length ? "active" : "pending", tone: jdRows.length ? "success" : "warning", label: jdRows.length ? "Đang tuyển dụng" : "Cần thêm JD" }}
        actions={
          <>
            <Button variant="primary" onClick={onManageDocuments}>
              <BriefcaseBusiness size={16} /> Tạo Job
            </Button>
            <Button variant="secondary" onClick={onOpenCandidates || onOpenReports}>
              <UsersRound size={16} /> Xem ứng viên
            </Button>
          </>
        }
        aside={
          <div className="dashboard-banner-metrics">
            <span>
              <strong>{reviewReadyCount}</strong>
              AI sẵn sàng
            </span>
            <span>
              <strong>{jdRows.length}</strong>
              JD hoạt động
            </span>
          </div>
        }
      />

      {isDocumentLoading && !candidateCount && !jdRows.length ? <DashboardLoadingState cardCount={5} /> : null}

      <DashboardSection title="Chỉ số nhanh" description="Số liệu tuyển dụng ưu tiên cho một phiên review ngắn.">
        <div className="dashboard-stat-grid">
          <StatCard label="JD hoạt động" value={jdRows.length} helper="JD đang sẵn sàng" icon={BriefcaseBusiness} loading={isDocumentLoading} />
          <StatCard label="Tổng ứng viên" value={candidateCount} helper="Hồ sơ CV hiện có" icon={UsersRound} tone="success" loading={isDocumentLoading} />
          <StatCard label="Chờ đánh giá" value={candidateCount} helper="Cần xem xét" icon={ClipboardCheck} tone="warning" loading={isDocumentLoading} />
          <StatCard label="Lịch phỏng vấn" value="0" helper="Số lịch đã lên" icon={CalendarClock} tone="neutral" />
          <StatCard label="Đề xuất bởi AI" value={reviewReadyCount} helper="CV và JD phù hợp" icon={Sparkles} tone="info" />
        </div>
      </DashboardSection>

      <div className="dashboard-main-grid">
        <ChartCard title="Tiến trình ứng tuyển" subtitle="Các bước trong quy trình xét duyệt ứng viên.">
          <PipelineBoard
            items={[
              { label: "Nộp hồ sơ", value: candidateCount, helper: "CV đã nhận", tone: "primary" },
              { label: "Đang duyệt", value: candidateCount, helper: "Chờ xem xét", tone: "warning" },
              { label: "Phỏng vấn", value: realSessions.length, helper: "Số lượt phỏng vấn", tone: "info" },
              { label: "Đạt yêu cầu", value: 0, helper: "Ứng viên trúng tuyển", tone: "success" },
              { label: "Từ chối", value: 0, helper: "Hồ sơ không khớp", tone: "neutral" },
            ]}
          />
        </ChartCard>

        <AIInsightCard
          eyebrow="Nhận định tuyển dụng AI"
          title="Danh sách đề xuất"
          score={reviewReadyCount}
          summary={reviewReadyCount
            ? "Đã có hồ sơ và JD để chạy matching trước khi review thủ công."
            : "Tải JD và nhận hồ sơ ứng viên để AI tạo danh sách review có ngữ cảnh."}
          items={[
            { label: "JD hoạt động", value: jdRows.length },
            { label: "Hồ sơ ứng viên", value: candidateCount },
          ]}
          action={
            <Button variant="secondary" onClick={onOpenCandidates || onOpenReports}>
              <Sparkles size={16} /> Xem báo cáo AI
            </Button>
          }
        />
      </div>

      <div className="dashboard-two-column-grid">
        <ChartCard title="Recent candidates" subtitle="Hồ sơ CV gần đây cần xem theo trạng thái review.">
          <RecentTable
            columns={HR_CANDIDATE_COLUMNS}
            rows={cvRows.slice(0, 5)}
            emptyState={
              <EmptyState
                icon={UserRound}
                title="Chưa có ứng viên để review"
                description="Hồ sơ ứng viên và AI score sẽ xuất hiện tại đây khi nguồn candidate được kết nối."
                className="py-7"
              />
            }
          />
        </ChartCard>

        <ChartCard title="Job performance" subtitle="Tin tuyển dụng gần nhất trong kho JD.">
          <RecentTable
            columns={HR_JOB_COLUMNS}
            rows={jdRows.slice(0, 5)}
            emptyState={
              <EmptyState
                icon={BriefcaseBusiness}
                title="Chưa có JD đang tuyển"
                description="Tạo JD đầu tiên để mở candidate pipeline và matching."
                className="py-7"
              />
            }
          />
        </ChartCard>
      </div>

      <DashboardSection title="Quick actions" description="Những tác vụ HR cần mở nhanh từ overview.">
        <div className="dashboard-quick-grid">
          <QuickActionCard title="Create Job" description="Tải hoặc cập nhật JD." icon={BriefcaseBusiness} onClick={onManageDocuments} />
          <QuickActionCard title="View Candidates" description="Mở bảng review ứng viên." icon={UsersRound} onClick={onOpenCandidates || onOpenReports} tone="success" />
          <QuickActionCard title="Schedule Interview" description="Vào luồng phỏng vấn AI." icon={CalendarClock} onClick={onStartInterview} tone="info" />
          <QuickActionCard title="Review AI Results" description="Xem lịch sử và đánh giá." icon={BarChart3} onClick={onOpenReports} tone="warning" />
        </div>
      </DashboardSection>
    </div>
  );
}

function CandidateDashboard({
  user,
  onStartInterview,
  onOpenReports,
  onManageDocuments,
  onOpenMatch,
  cvRows,
  jdRows,
  isDocumentLoading,
  realSessions = [],
}) {
  const profileCompletion = getProfileCompletion(cvRows.length);
  const completedSessions = realSessions.filter(s => s.status === "completed" && s.evaluation);
  const latestSession = completedSessions[0];
  const interviewScore = latestSession ? clampScore(latestSession.evaluation?.overall_score) : null;
  const recommendedJobs = jdRows.slice(0, 3);
  const recentActivity = [
    ...cvRows.slice(0, 2).map((item) => ({
      id: `candidate-cv-${item.id}`,
      title: item.name || item.fileName || "CV đã cập nhật",
      description: item.role && item.role !== "N/A" ? `Mục tiêu: ${item.role}` : "Hồ sơ sẵn sàng để luyện tập.",
      meta: item.updatedAt,
      icon: FileText,
      tone: "primary",
    })),
    ...(latestSession ? [{
      id: `report-${latestSession.id}`,
      title: latestSession.job_posting?.title || latestSession.practice_config?.target_role || "Phỏng vấn luyện tập",
      description: `Đề xuất tuyển dụng: ${latestSession.evaluation?.evaluation?.hiring_recommendation || "Đã hoàn tất"}`,
      meta: `${latestSession.evaluation?.overall_score}/100`,
      icon: History,
      tone: "success",
    }] : []),
  ];

  return (
    <div className="role-workspace user dashboard-workspace">
      <DashboardHeader
        eyebrow="Không gian Ứng viên"
        title={user?.name ? `Xin chào, ${user.name}` : "Trợ lý nghề nghiệp AI"}
        description="Nhìn ngay bước tiếp theo để hoàn thiện hồ sơ, tìm job phù hợp và luyện phỏng vấn."
      />

      <WelcomeBanner
        eyebrow="Trợ lý nghề nghiệp AI sẵn sàng"
        title="Luyện tập phỏng vấn ngay hôm nay để nâng cao kỹ năng"
        description={cvRows.length
          ? "CV đã sẵn sàng. Chọn JD phù hợp hoặc mở một phiên luyện phỏng vấn để nhận insight tiếp theo."
          : "Tải CV trước để AI hiểu hồ sơ, gợi ý việc làm và mở phiên phỏng vấn có ngữ cảnh."}
        icon={WandSparkles}
        status={{ status: cvRows.length ? "active" : "pending", tone: cvRows.length ? "success" : "warning", label: cvRows.length ? "Hồ sơ sẵn sàng" : "Cần tải CV" }}
        actions={
          <>
            <Button variant="primary" onClick={onStartInterview} disabled={!cvRows.length}>
              <Sparkles size={16} /> Bắt đầu Luyện phỏng vấn AI
            </Button>
            <Button variant="secondary" onClick={onOpenMatch}>
              <BriefcaseBusiness size={16} /> Tìm Việc làm Phù hợp
            </Button>
          </>
        }
        aside={
          <div className="dashboard-banner-metrics">
            <span>
              <strong>{profileCompletion}%</strong>
              hồ sơ
            </span>
            <span>
              <strong>{interviewScore ?? "--"}</strong>
              điểm AI
            </span>
          </div>
        }
      />

      {isDocumentLoading && !cvRows.length && !jdRows.length ? <DashboardLoadingState cardCount={5} /> : null}

      <DashboardSection title="Chỉ số nhanh" description="Tổng quan hành trình ứng tuyển và mức sẵn sàng luyện tập.">
        <div className="dashboard-stat-grid">
          <StatCard label="Việc làm đã nộp" value="0" helper="Số đơn đã ứng tuyển" icon={ClipboardCheck} tone="neutral" />
          <StatCard label="Việc làm đã lưu" value="0" helper="Lưu từ bảng tuyển dụng" icon={BriefcaseBusiness} tone="info" />
          <StatCard label="Phiên phỏng vấn" value={realSessions.length} helper="Lượt luyện tập & thực tế" icon={History} />
          <StatCard label="Hồ sơ hoàn thiện" value={`${profileCompletion}%`} helper={cvRows.length ? "CV đã tải lên" : "Cần thêm CV"} icon={CheckCircle2} tone="success" loading={isDocumentLoading} />
          <StatCard label="Điểm Phỏng vấn AI" value={interviewScore ?? "--"} helper={latestSession ? (latestSession.job_posting?.title || latestSession.practice_config?.target_role) : "Chưa luyện tập"} icon={Sparkles} tone="warning" />
        </div>
      </DashboardSection>

      <div className="dashboard-main-grid">
        <ProgressCard
          title="Tiến độ luyện tập AI"
          description="Theo dõi các tín hiệu quan trọng trước vòng phỏng vấn tiếp theo."
          items={[
            { label: "Hồ sơ hoàn thiện", value: profileCompletion },
            { label: "Mức độ sẵn sàng", value: interviewScore || (cvRows.length ? 58 : 22) },
            { label: "Độ phù hợp công việc", value: jdRows.length ? Math.min(92, 42 + jdRows.length * 12) : 18 },
          ]}
          action={
            <Button variant="ghost" onClick={onOpenReports}>
              <History size={16} /> Xem kết quả
            </Button>
          }
        />

        <AIInsightCard
          title={cvRows.length ? "Gợi ý tiếp theo" : "Xây dựng tín hiệu hồ sơ"}
          score={interviewScore ?? profileCompletion}
          summary={cvRows.length
            ? "Bạn đã có hồ sơ. Luyện 10 phút hôm nay để cải thiện cấu trúc câu trả lời và xem job match mới."
            : "Bắt đầu bằng CV để AI cá nhân hóa gợi ý công việc, strengths và phần cần cải thiện."}
          items={[
            { label: "Thế mạnh", value: cvRows.length ? "Hồ sơ sẵn sàng" : "Đang bắt đầu" },
            { label: "Tập trung", value: jdRows.length ? "Đối chiếu JD" : "Tải lên CV" },
          ]}
          action={
            <Button variant="secondary" onClick={onManageDocuments}>
              <FileText size={16} /> Cập nhật CV / Hồ sơ
            </Button>
          }
        />
      </div>

      <div className="dashboard-two-column-grid dashboard-candidate-grid">
        <ChartCard title="Việc làm gợi ý" subtitle="Các công việc tuyển dụng đang mở phù hợp với định hướng của bạn.">
          {recommendedJobs.length ? (
            <div className="dashboard-job-list">
              {recommendedJobs.map((job) => (
                <article key={job.id} className="dashboard-job-card">
                  <div>
                    <StatusBadge status="active">Mức độ phù hợp cao</StatusBadge>
                    <h4>{job.title || job.fileName || "Vị trí tuyển dụng"}</h4>
                    <p>{job.company || "Chưa có công ty"}</p>
                  </div>
                  <div className="dashboard-job-meta">
                     <span>{job.postedAt || "Mới cập nhật"}</span>
                     <span>{job.summary ? "Có mô tả" : "Mở chi tiết"}</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={onOpenMatch}>
                    Xem chi tiết
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BriefcaseBusiness}
              title="Chưa có việc làm phù hợp để gợi ý"
              description="Hệ thống sẽ tự động gợi ý các vị trí phù hợp khi nhà tuyển dụng đăng tin tuyển dụng mới."
              className="py-7"
            />
          )}
        </ChartCard>

        <div className="dashboard-side-stack">
          <ChartCard title="Trạng thái ứng tuyển" subtitle="Theo dõi tiến độ ứng tuyển khi hồ sơ được kết nối.">
            <EmptyState
              icon={ClipboardCheck}
              title="Chưa ứng tuyển việc làm nào"
              description="Khi ứng tuyển một công việc, trạng thái nộp đơn, phỏng vấn và nhận đề nghị sẽ xuất hiện ở đây."
              className="py-7"
            />
          </ChartCard>

          <ChartCard title="Hoạt động gần đây" subtitle="CV và kết quả luyện tập gần đây.">
            <ActivityList
              items={recentActivity}
              emptyTitle="Chưa có hoạt động"
              emptyDescription="Tải CV hoặc bắt đầu phiên phỏng vấn đầu tiên."
              emptyIcon={History}
            />
          </ChartCard>
        </div>
      </div>

      <DashboardSection title="Tác vụ nhanh" description="Đi thẳng vào hành động có giá trị nhất tiếp theo.">
        <div className="dashboard-quick-grid">
          <QuickActionCard title="Luyện tập Phỏng vấn" description="Bắt đầu phiên phỏng vấn AI." icon={Sparkles} onClick={onStartInterview} disabled={!cvRows.length} />
          <QuickActionCard title="Cập nhật hồ sơ" description="Hoàn thiện hồ sơ nguồn." icon={FileText} onClick={onManageDocuments} tone="success" />
          <QuickActionCard title="Tìm việc làm" description="Tìm JD để đối chiếu CV." icon={BriefcaseBusiness} onClick={onOpenMatch} tone="info" />
          <QuickActionCard title="Xem lịch sử" description="Xem lịch sử kết quả." icon={History} onClick={onOpenReports} tone="warning" />
        </div>
      </DashboardSection>
    </div>
  );
}

export function OverviewScreen({
  onStartInterview,
  onOpenReports,
  managementOnly = false,
  onManageUsers,
  onManageDocuments,
  onOpenMatch,
  onOpenCandidates,
  cvRows = [],
  jdRows = [],
  cvCount = 0,
  jdCount = 0,
  isDocumentLoading = false,
  realSessions = [],
}) {
  const { user } = useUser();
  const role = String(user?.role || "").toLowerCase();
  const isRecruiter = role.includes("hr") || role.includes("recruiter");
  const resolvedCvRows = cvRows.length ? cvRows : Array.from({ length: cvCount }, (_, index) => ({ id: `cv-${index}` }));
  const resolvedJdRows = jdRows.length ? jdRows : Array.from({ length: jdCount }, (_, index) => ({ id: `jd-${index}` }));

  if (managementOnly) {
    return (
      <AdminDashboard
        onManageUsers={onManageUsers}
        onManageDocuments={onManageDocuments}
        onOpenMatch={onOpenMatch}
        cvRows={resolvedCvRows}
        jdRows={resolvedJdRows}
        isDocumentLoading={isDocumentLoading}
      />
    );
  }

  if (isRecruiter) {
    return (
      <RecruiterDashboard
        onManageDocuments={onManageDocuments}
        onOpenCandidates={onOpenCandidates}
        onOpenReports={onOpenReports}
        onStartInterview={onStartInterview}
        cvRows={resolvedCvRows}
        jdRows={resolvedJdRows}
        isDocumentLoading={isDocumentLoading}
        realSessions={realSessions}
      />
    );
  }

  return (
    <CandidateDashboard
      user={user}
      onStartInterview={onStartInterview}
      onOpenReports={onOpenReports}
      onManageDocuments={onManageDocuments}
      onOpenMatch={onOpenMatch}
      cvRows={resolvedCvRows}
      jdRows={resolvedJdRows}
      isDocumentLoading={isDocumentLoading}
      realSessions={realSessions}
    />
  );
}
