import { X } from "lucide-react";

function formatSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "N/A";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderList(values) {
  if (!Array.isArray(values) || !values.length) {
    return <span className="text-slate-500">N/A</span>;
  }
  return (
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
      {values.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function CvDetailWindow({ selectedCv, onClose }) {
  const previewUrl =
    selectedCv?.cvPdf || selectedCv?.downloadUrl || selectedCv?.previewUrl || "";
  const parseStatus = selectedCv?.cvParseStatus || "idle";
  const parseData = selectedCv?.cvParseData;

  return (
    <section
      className="legacy-window"
      style={{ width: "min(100%, 1280px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết CV"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Chi tiết CV</h3>
          <p className="mt-1 text-sm text-slate-600">
            {selectedCv?.name || selectedCv?.fileName || "N/A"} •{" "}
            {selectedCv?.role || "N/A"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700"
          aria-label="Đóng cửa sổ"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-base font-bold text-slate-900">CV gốc</h4>
          <div className="mt-3 h-[calc(100vh-280px)] min-h-[560px] rounded-xl border border-slate-200 bg-white">
            {previewUrl ? (
              <iframe
                title="cv-preview"
                src={`${previewUrl}#zoom=page-fit`}
                className="h-full w-full rounded-xl"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500">
                Không có preview. Vui lòng lấy lại link xem từ server.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-base font-bold text-slate-900">Thông tin file</h4>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="legacy-window-kv">
              <span>ID</span>
              <strong>{selectedCv?.id ?? "N/A"}</strong>
            </div>
            <div className="legacy-window-kv">
              <span>Tên file</span>
              <strong>{selectedCv?.name || selectedCv?.fileName || "N/A"}</strong>
            </div>
            <div className="legacy-window-kv">
              <span>Vị trí mục tiêu</span>
              <strong>{selectedCv?.role || "N/A"}</strong>
            </div>
            <div className="legacy-window-kv">
              <span>Cập nhật</span>
              <strong>{selectedCv?.updatedAt || "N/A"}</strong>
            </div>
            <div className="legacy-window-kv">
              <span>Loại file</span>
              <strong>{selectedCv?.mimeType || "N/A"}</strong>
            </div>
            <div className="legacy-window-kv">
              <span>Kích thước</span>
              <strong>{formatSize(selectedCv?.sizeBytes)}</strong>
            </div>
          </div>

          <h4 className="mt-4 text-base font-bold text-slate-900">
            Dữ liệu đọc từ CV (PyMuPDF)
          </h4>
          <div className="mt-3 h-[calc(100vh-440px)] min-h-[400px] overflow-auto rounded-xl border border-slate-200 bg-white p-3">
            {parseStatus === "loading" ? (
              <p className="text-sm text-slate-500">
                Đang đọc dữ liệu CV bằng PyMuPDF...
              </p>
            ) : null}

            {parseStatus === "error" ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {selectedCv?.cvParseError || "Không thể đọc dữ liệu CV."}
              </div>
            ) : null}

            {parseStatus === "success" && parseData ? (
              <div className="space-y-4">
                <div className="legacy-window-kv">
                  <span>Số trang</span>
                  <strong>{parseData.page_count ?? "N/A"}</strong>
                </div>
                <div className="legacy-window-kv">
                  <span>Số ký tự</span>
                  <strong>{parseData.character_count ?? "N/A"}</strong>
                </div>
                <div className="legacy-window-kv">
                  <span>Tóm tắt</span>
                  <strong>{parseData.profile_summary || "N/A"}</strong>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Email</p>
                  {renderList(parseData.contacts?.emails)}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Số điện thoại</p>
                  {renderList(parseData.contacts?.phones)}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Link</p>
                  {renderList(parseData.contacts?.links)}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Highlights</p>
                  {renderList(parseData.highlights)}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Văn bản trích xuất
                    {parseData.is_truncated ? " (đã cắt bớt)" : ""}
                  </p>
                  <pre className="mt-2 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    {parseData.extracted_text || "N/A"}
                  </pre>
                </div>
              </div>
            ) : null}

            {parseStatus === "idle" ? (
              <p className="text-sm text-slate-500">
                Chưa có dữ liệu phân tích CV.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
