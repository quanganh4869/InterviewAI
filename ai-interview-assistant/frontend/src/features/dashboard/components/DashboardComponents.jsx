import { ArrowUpRight, Sparkles } from "lucide-react";
import {
  EmptyState,
  ProgressLine,
  SectionCard,
  Skeleton,
  StatusBadge,
} from "../../../components/ui";

export function DashboardHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="dashboard-header">
      <div>
        {eyebrow ? <span className="dashboard-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="dashboard-header-actions">{actions}</div> : null}
    </header>
  );
}

export function WelcomeBanner({
  eyebrow,
  title,
  description,
  icon: Icon = Sparkles,
  status,
  actions,
  aside,
}) {
  return (
    <section className="dashboard-welcome">
      <div className="dashboard-welcome-main">
        <div className="dashboard-welcome-copy">
          <div className="dashboard-welcome-kicker">
            <span className="dashboard-welcome-icon">
              <Icon size={18} />
            </span>
            {eyebrow ? <span>{eyebrow}</span> : null}
            {status ? <StatusBadge status={status.status} tone={status.tone}>{status.label}</StatusBadge> : null}
          </div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="dashboard-welcome-actions">{actions}</div> : null}
      </div>
      {aside ? <aside className="dashboard-welcome-aside">{aside}</aside> : null}
    </section>
  );
}

export function DashboardSection({ title, description, action, children, className = "" }) {
  return (
    <section className={`dashboard-section ${className}`.trim()}>
      {(title || description || action) ? (
        <header className="dashboard-section-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  helper,
  trend,
  icon: Icon,
  tone = "primary",
  loading = false,
}) {
  return (
    <article className={`dashboard-stat dashboard-tone-${tone}`.trim()}>
      <div className="dashboard-stat-head">
        <span>{label}</span>
        {Icon ? (
          <span className="dashboard-stat-icon">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
      {loading ? <Skeleton className="dashboard-stat-skeleton" /> : <strong>{value}</strong>}
      <div className="dashboard-stat-foot">
        {helper ? <small>{helper}</small> : null}
        {trend ? <b>{trend}</b> : null}
      </div>
    </article>
  );
}

export function ChartCard({ title, subtitle, action, children, className = "" }) {
  return (
    <SectionCard title={title} subtitle={subtitle} action={action} className={`dashboard-chart-card ${className}`.trim()}>
      {children}
    </SectionCard>
  );
}

export function ActivityList({ items = [], emptyTitle, emptyDescription, emptyIcon }) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} className="py-7" />;
  }

  return (
    <div className="dashboard-activity-list">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.id || `${item.title}-${item.meta || ""}`} className="dashboard-activity-item">
            <span className={`dashboard-activity-icon dashboard-tone-${item.tone || "primary"}`.trim()}>
              {Icon ? <Icon size={16} /> : null}
            </span>
            <div>
              <strong>{item.title}</strong>
              {item.description ? <p>{item.description}</p> : null}
            </div>
            {item.meta ? <small>{item.meta}</small> : null}
          </article>
        );
      })}
    </div>
  );
}

export function QuickActionCard({
  title,
  description,
  actionLabel = "Mở",
  icon: Icon,
  onClick,
  tone = "primary",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`dashboard-quick-action dashboard-tone-${tone}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="dashboard-quick-icon">{Icon ? <Icon size={19} /> : null}</span>
      <span className="dashboard-quick-copy">
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <span className="dashboard-quick-link">
        {actionLabel}
        <ArrowUpRight size={15} />
      </span>
    </button>
  );
}

export function RecentTable({ columns = [], rows = [], emptyState }) {
  if (!rows.length) {
    return emptyState || <EmptyState title="Chưa có dữ liệu gần đây" className="py-7" />;
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key] || "N/A"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AIInsightCard({ eyebrow = "AI Insight", title, score, summary, items = [], action }) {
  return (
    <article className="dashboard-ai-insight">
      <div className="dashboard-ai-insight-head">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        {score !== undefined && score !== null ? (
          <strong>{score}</strong>
        ) : null}
      </div>
      {summary ? <p>{summary}</p> : null}
      {items.length ? (
        <div className="dashboard-insight-points">
          {items.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {action ? <div className="dashboard-ai-insight-action">{action}</div> : null}
    </article>
  );
}

export function ProgressCard({ title, description, items = [], action }) {
  return (
    <SectionCard title={title} subtitle={description} action={action} className="dashboard-progress-card">
      <div className="dashboard-progress-list">
        {items.map((item) => (
          <ProgressLine key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </SectionCard>
  );
}

export function DashboardLoadingState({ cardCount = 4 }) {
  return (
    <div className="dashboard-loading-state" aria-label="Đang tải dashboard">
      <div className="dashboard-stat-grid">
        {Array.from({ length: cardCount }, (_, index) => (
          <StatCard key={index} label="Đang tải" value="" loading />
        ))}
      </div>
      <div className="dashboard-loading-panels">
        <Skeleton className="dashboard-panel-skeleton" />
        <Skeleton className="dashboard-panel-skeleton" />
      </div>
    </div>
  );
}
