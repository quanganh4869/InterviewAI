export function EmptyState({ title = "Không có dữ liệu", description, icon: Icon, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-10 text-center text-[var(--color-text-muted)] ${className}`.trim()}
    >
      {Icon ? <Icon className="mb-2 h-6 w-6 text-[var(--color-text-muted)]" /> : null}
      <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm">{description}</p> : null}
    </div>
  );
}
