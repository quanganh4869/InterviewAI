import React, { useEffect, useState } from "react";
import { Loader2, Users, FileText, Briefcase, Video, Award, CheckCircle2 } from "lucide-react";
import { authedFetch } from "../../../api/authClient";
import { SectionCard } from "../../../components/ui";

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await authedFetch("/v1_0/admin/statistics");
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load statistics:", err);
      setError(err.message || "Không thể tải số liệu thống kê hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-[var(--color-text-muted)]">Đang tải số liệu thống kê...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        <p className="font-bold">⚠️ Có lỗi xảy ra</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const {
    total_users = 0,
    total_cvs = 0,
    total_jds = 0,
    total_interviews = 0,
    role_distribution = {},
    plan_distribution = {},
    daily_interviews = [],
  } = stats || {};

  // Donut Chart calculation helpers
  const renderDonutChart = (dist, colors, labels) => {
    const data = Object.entries(dist).map(([key, val]) => ({
      label: labels[key.toUpperCase()] || key,
      value: val,
    }));
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[var(--color-text-muted)]">
          No data available
        </div>
      );
    }

    let accumulatedLength = 0;
    const radius = 30;
    const circumference = 2 * Math.PI * radius; // ~188.5

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            {data.map((item, idx) => {
              const percent = (item.value / total) * 100;
              const strokeLength = (percent / 100) * circumference;
              const strokeOffset = circumference - strokeLength - accumulatedLength;
              accumulatedLength += strokeLength;

              return (
                <circle
                  key={item.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={colors[idx] || "#cbd5e1"}
                  strokeWidth="8"
                  strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-500 ease-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-[var(--color-text)]">{total}</span>
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Tổng số</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-xs w-full">
          {data.map((item, idx) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx] }} />
                  <span className="font-bold text-[var(--color-text-muted)]">{item.label}</span>
                </div>
                <div className="font-extrabold text-[var(--color-text)]">
                  {item.value} <span className="text-[10px] font-bold text-[var(--color-text-muted)]">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // SVG Line Chart coordinates calculation
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - 2 * paddingX;
  const chartHeight = height - 2 * paddingY;

  const maxInterviews = Math.max(...daily_interviews.map(d => d.count), 5);

  const points = daily_interviews.map((d, index) => {
    const x = paddingX + (index / (daily_interviews.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - (d.count / maxInterviews) * chartHeight;
    return { x, y, date: d.date, count: d.count };
  });

  const linePath = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="role-hero">
        <div className="role-hero-content">
          <div>
            <span className="ds-badge ds-badge-active bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400">Hệ thống</span>
            <h2>Tổng quan Quản trị</h2>
            <p>Số liệu thống kê thời gian thực và quản lý tài nguyên của dự án hiện tại.</p>
          </div>
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tổng người dùng", value: total_users, icon: Users, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Tổng số CV", value: total_cvs, icon: FileText, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Tổng số JD", value: total_jds, icon: Briefcase, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Tổng số lượt phỏng vấn", value: total_interviews, icon: Video, color: "text-purple-600 bg-purple-50 border-purple-100" },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <article key={idx} className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${item.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{item.label}</p>
                <h3 className="mt-1 text-2xl font-black text-[var(--color-text)]">{item.value}</h3>
              </div>
            </article>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Interviews Line Chart */}
        <div className="lg:col-span-2">
          <SectionCard title="Hoạt động Phỏng vấn" subtitle="Lượt phỏng vấn hàng ngày trong 7 ngày qua">
            <div className="relative mt-4">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingY + ratio * chartHeight;
                  const label = Math.round(maxInterviews * (1 - ratio));
                  return (
                    <g key={idx} className="opacity-40">
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={width - paddingX}
                        y2={y}
                        stroke="var(--color-border)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="bold"
                        fill="var(--color-text-muted)"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* Area under the line */}
                {areaPath && (
                  <path d={areaPath} fill="url(#areaGrad)" />
                )}

                {/* Line Path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shadow-sm"
                  />
                )}

                {/* Dots and Labels */}
                {points.map((p, idx) => {
                  const isHovered = hoveredPoint === idx;
                  return (
                    <g key={idx}>
                      {/* Invisible larger hover circle */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="14"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(idx)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* Visible interactive dot */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? "7" : "4.5"}
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth={isHovered ? "2.5" : "1.5"}
                        className="transition-all duration-150"
                      />
                      {/* X-axis date labels */}
                      <text
                        x={p.x}
                        y={height - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="var(--color-text-muted)"
                      >
                        {p.date}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Float Hover Tooltip */}
              {hoveredPoint !== null && points[hoveredPoint] && (
                <div
                  className="absolute z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold shadow-md animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    left: `${(points[hoveredPoint].x / width) * 100}%`,
                    top: `${(points[hoveredPoint].y / height) * 100 - 18}%`,
                    transform: "translateX(-50%) translateY(-100%)",
                  }}
                >
                  <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">{points[hoveredPoint].date}</p>
                  <p className="text-blue-600 mt-0.5">{points[hoveredPoint].count} lượt phỏng vấn</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Donut Distributions Charts */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Phân bổ Quyền" subtitle="Tỷ lệ người dùng và HR tuyển dụng">
            <div className="mt-2">
              {renderDonutChart(
                role_distribution,
                ["#3b82f6", "#10b981", "#8b5cf6"],
                { USER: "Candidate", HR: "Recruiter / HR", ADMIN: "Quản trị viên" }
              )}
            </div>
          </SectionCard>

          <SectionCard title="Gói dịch vụ" subtitle="Phân bổ gói người dùng đăng ký">
            <div className="mt-2">
              {renderDonutChart(
                plan_distribution,
                ["#cbd5e1", "#3b82f6", "#a855f7"],
                { FREE: "Miễn phí (FREE)", PRO: "Chuyên nghiệp (PRO)", ULTRA: "Đặc quyền (ULTRA)" }
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
