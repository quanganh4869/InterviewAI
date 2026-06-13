export function PageHeader({ title, eyebrow, actions, meta, className = "" }) {
  return (
    <header className={`flex flex-wrap items-center justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-xs font-bold uppercase tracking-normal text-blue-700">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="truncate text-xl font-extrabold text-[var(--color-text)]">{title}</h1>
        {meta ? <div className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
