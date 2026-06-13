export function ProgressLine({ label, value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="progress-line">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
