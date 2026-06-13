export function DataToolbar({ children, className = "" }) {
  return (
    <section className={`ds-toolbar ${className}`.trim()}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {children}
      </div>
    </section>
  );
}
