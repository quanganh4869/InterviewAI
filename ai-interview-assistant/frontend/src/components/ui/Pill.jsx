export function Pill({ children, tone = "default", className = "" }) {
  return (
    <span className={`pill pill-${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
