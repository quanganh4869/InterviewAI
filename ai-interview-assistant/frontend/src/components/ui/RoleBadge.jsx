const ROLE_LABEL = {
  admin: "Admin",
  user: "User",
  HR: "HR",
  hr: "HR",
};

const ROLE_CLASS = {
  admin: "border-blue-200 bg-blue-50 text-blue-700",
  user: "border-slate-200 bg-slate-50 text-slate-700",
  HR: "border-emerald-200 bg-emerald-50 text-emerald-700",
  hr: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function RoleBadge({ role, className = "" }) {
  const normalized = String(role || "user");
  const key = normalized.toLowerCase() === "hr" ? "hr" : normalized;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${ROLE_CLASS[key] || ROLE_CLASS.user} ${className}`.trim()}
    >
      {ROLE_LABEL[key] || normalized}
    </span>
  );
}
