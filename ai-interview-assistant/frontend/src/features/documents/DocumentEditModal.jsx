export function DocumentEditModal({
  editDocument,
  savingDocument,
  onChange,
  onClose,
  onSave,
}) {
  if (!editDocument) return null;

  const isCv = editDocument.documentType === "cv";
  const setField = (field, value) => onChange((prev) => ({ ...prev, [field]: value }));

  return (
    <div
      className="fixed inset-0 z-[135] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-md"
      onClick={() => (!savingDocument ? onClose() : null)}
    >
      <section
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-bold text-slate-900">
          {isCv ? "Edit CV" : "Edit JD"}
        </h3>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-500">File name</span>
            <input
              value={editDocument.fileName || ""}
              onChange={(event) => setField("fileName", event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {isCv ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Target role</span>
              <input
                value={editDocument.targetRole || ""}
                onChange={(event) => setField("targetRole", event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          ) : (
            <>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-500">JD title</span>
                <input
                  value={editDocument.title || ""}
                  onChange={(event) => setField("title", event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Company</span>
                <input
                  value={editDocument.company || ""}
                  onChange={(event) => setField("company", event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Summary</span>
                <textarea
                  rows={4}
                  value={editDocument.summary || ""}
                  onChange={(event) => setField("summary", event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={onClose}
            disabled={savingDocument}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSave}
            disabled={savingDocument}
          >
            {savingDocument ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}
