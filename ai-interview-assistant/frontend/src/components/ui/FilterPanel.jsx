export function FilterPanel({ children, className = "" }) {
  return <section className={`filter-panel ${className}`.trim()}>{children}</section>;
}
