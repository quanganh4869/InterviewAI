export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  isSubmitting = false,
  tone = "danger",
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700";

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-md">
      <section className="w-full max-w-md rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
        {message ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-[10px] border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
