import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ExternalLink,
  FileText,
  MapPin,
  X,
} from "lucide-react";

const FIELD_LABELS = [
  ["companyWebsiteUrl", "Company website"],
  ["location", "Location"],
  ["salary", "Salary"],
  ["workType", "Work type"],
  ["experience", "Experience"],
  ["level", "Candidate level"],
  ["deadline", "Deadline"],
];

const CONTENT_LABELS = [
  ["description", "Job description"],
  ["requirements", "Requirements"],
  ["benefits", "Benefits"],
];

function readLabelValue(summary, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inlinePattern = new RegExp(
    `(?:^|\\n)\\s*${escaped}:\\s*([^\\n]+)`,
    "i",
  );
  return String(summary || "").match(inlinePattern)?.[1]?.trim() || "";
}

function readSection(summary, label, followingLabels) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextLabels = followingLabels
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(
    `(?:^|\\n)\\s*${escaped}:\\s*\\n?([\\s\\S]*?)${nextLabels ? `(?=\\n\\s*(?:${nextLabels}):|$)` : "$"}`,
    "i",
  );
  return String(summary || "").match(pattern)?.[1]?.trim() || "";
}

function parseJdSummary(summary) {
  const source = String(summary || "").trim();
  const structuredFields = Object.fromEntries(
    FIELD_LABELS.map(([key, label]) => [key, readLabelValue(source, label)]),
  );
  const content = Object.fromEntries(
    CONTENT_LABELS.map(([key, label], index) => [
      key,
      readSection(
        source,
        label,
        CONTENT_LABELS.slice(index + 1).map(([, nextLabel]) => nextLabel),
      ),
    ]),
  );

  const hasStructuredContent = [
    ...Object.values(structuredFields),
    ...Object.values(content),
  ].some(Boolean);

  return {
    ...structuredFields,
    ...content,
    rawSummary: source,
    hasStructuredContent,
  };
}

function DetailField({ label, value, wide = false }) {
  return (
    <label className={`jd-detail-field ${wide ? "wide" : ""}`.trim()}>
      <span>{label}</span>
      <strong>{value || "Chưa cập nhật"}</strong>
    </label>
  );
}

function TextSection({ title, value, placeholder }) {
  return (
    <section className="jd-detail-copy-block">
      <h4>{title}</h4>
      <div className="jd-detail-copy">{value || placeholder}</div>
    </section>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title }) {
  return (
    <header className="jd-detail-section-head">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <small>{eyebrow}</small>
        <h3>{title}</h3>
      </div>
    </header>
  );
}

function formatFileSize(sizeBytes) {
  const size = Number(sizeBytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "Chưa cập nhật";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function JdDetailWindow({ selectedJd, onClose }) {
  const jd = parseJdSummary(selectedJd?.summary);
  const canOpenFile = Boolean(selectedJd?.downloadUrl);

  return (
    <section
      className="legacy-window jd-detail-window"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết JD"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="legacy-window-head jd-detail-topbar">
        <div className="legacy-window-title-row">
          <span className="legacy-window-icon">
            <BriefcaseBusiness size={20} />
          </span>
          <div>
            <h3>Chi tiết JD</h3>
            <p>
              {selectedJd?.title || "Vị trí chưa cập nhật"} •{" "}
              {selectedJd?.company || "Công ty chưa cập nhật"}
            </p>
          </div>
        </div>
        <div className="legacy-window-actions">
          {canOpenFile ? (
            <a
              href={selectedJd.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="jd-detail-file-link"
            >
              <FileText size={16} />
              Xem file
              <ExternalLink size={15} />
            </a>
          ) : null}
          <button
            type="button"
            className="legacy-window-close"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <form className="jd-detail-sheet" aria-label="Thông tin JD đầy đủ">
        <section className="jd-detail-section">
          <SectionHeading
            icon={Building2}
            eyebrow="Công ty"
            title="Thông tin doanh nghiệp"
          />
          <div className="jd-detail-field-grid">
            <DetailField label="Tên công ty" value={selectedJd?.company} />
            <DetailField label="Website" value={jd.companyWebsiteUrl} />
          </div>
        </section>

        <section className="jd-detail-section">
          <SectionHeading
            icon={MapPin}
            eyebrow="Vị trí"
            title="Thông tin tuyển dụng"
          />
          <div className="jd-detail-field-grid">
            <DetailField label="Tên vị trí" value={selectedJd?.title} wide />
            <DetailField label="Địa điểm" value={jd.location} />
            <DetailField label="Mức lương" value={jd.salary} />
            <DetailField label="Hình thức" value={jd.workType} />
            <DetailField label="Kinh nghiệm" value={jd.experience} />
            <DetailField label="Level ứng viên" value={jd.level} />
            <DetailField label="Hạn ứng tuyển" value={jd.deadline} />
          </div>
        </section>

        <section className="jd-detail-section">
          <SectionHeading
            icon={FileText}
            eyebrow="Nội dung"
            title="Mô tả JD"
          />
          {jd.hasStructuredContent ? (
            <div className="jd-detail-copy-grid">
              <TextSection
                title="Mô tả công việc"
                value={jd.description}
                placeholder="Chưa có mô tả công việc."
              />
              <TextSection
                title="Yêu cầu ứng viên"
                value={jd.requirements}
                placeholder="Chưa có yêu cầu ứng viên."
              />
              <TextSection
                title="Quyền lợi"
                value={jd.benefits}
                placeholder="Chưa có quyền lợi."
              />
            </div>
          ) : (
            <TextSection
              title="Nội dung JD"
              value={jd.rawSummary}
              placeholder="Chưa có nội dung JD."
            />
          )}
        </section>

        <section className="jd-detail-section">
          <SectionHeading
            icon={CalendarClock}
            eyebrow="Tài liệu"
            title="Thông tin lưu trữ"
          />
          <div className="jd-detail-field-grid">
            <DetailField label="ID" value={selectedJd?.id} />
            <DetailField label="Ngày tạo" value={selectedJd?.postedAt} />
            <DetailField
              label="Tên file"
              value={selectedJd?.fileName || selectedJd?.title}
              wide
            />
            <DetailField label="Loại file" value={selectedJd?.mimeType} />
            <DetailField label="Kích thước" value={formatFileSize(selectedJd?.sizeBytes)} />
          </div>
        </section>
      </form>
    </section>
  );
}
