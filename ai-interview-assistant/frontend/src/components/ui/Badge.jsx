const TONE_CLASS = {
  default: "badge-neutral",
  neutral: "badge-neutral",
  primary: "badge-primary",
  info: "badge-primary",
  success: "badge-success",
  good: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
};

const STATUS_TONE = {
  active: "success",
  approved: "success",
  passed: "success",
  completed: "success",
  reviewing: "primary",
  interview: "primary",
  applied: "primary",
  pending: "warning",
  draft: "warning",
  inactive: "neutral",
  rejected: "danger",
  error: "danger",
};

export function Badge({ children, tone = "default", className = "" }) {
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.default;
  return <span className={`badge ${toneClass} ${className}`.trim()}>{children}</span>;
}

export function StatusBadge({ status, children, tone, className = "" }) {
  const normalized = String(status || "").toLowerCase();
  const resolvedTone = tone || STATUS_TONE[normalized] || "neutral";
  const toneClass = `status-badge-${resolvedTone === "info" ? "primary" : resolvedTone}`;

  return (
    <span className={`status-badge ${toneClass} ${className}`.trim()}>
      {children || status || "N/A"}
    </span>
  );
}
