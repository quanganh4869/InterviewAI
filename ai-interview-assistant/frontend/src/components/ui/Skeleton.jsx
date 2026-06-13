export function Skeleton({ className = "", height, width }) {
  return <span className={`skeleton ${className}`.trim()} style={{ height, width }} aria-hidden="true" />;
}
