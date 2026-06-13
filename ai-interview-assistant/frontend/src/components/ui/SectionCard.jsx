export function SectionCard({ title, subtitle, children, action, className = "" }) {
  return (
    <article className={`section-card ${className}`.trim()}>
      {(title || subtitle || action) ? (
        <header className="section-card-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="min-w-0">{children}</div>
    </article>
  );
}
