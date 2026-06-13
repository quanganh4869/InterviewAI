export function toDisplayDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN");
}

export function mapCvRow(doc) {
  return {
    id: doc.id,
    name: doc.file_name,
    fileName: doc.file_name,
    role: doc.metadata_json?.target_role || "N/A",
    updatedAt: toDisplayDate(doc.created_at),
    mimeType: doc.mime_type || null,
    sizeBytes: doc.size_bytes || null,
  };
}

export function mapJdRow(doc) {
  const summary = doc.metadata_json?.summary || "";
  const logoMatch = String(summary).match(/Company logo:\s*(.+)/i);
  return {
    id: doc.id,
    title: doc.metadata_json?.title || doc.file_name,
    company: doc.metadata_json?.company || "N/A",
    summary,
    logoUrl: logoMatch?.[1]?.trim() || doc.metadata_json?.company_logo_url || "",
    fileName: doc.file_name,
    postedAt: toDisplayDate(doc.created_at),
    mimeType: doc.mime_type || null,
    sizeBytes: doc.size_bytes || null,
  };
}

export function getUploadErrorMessage(error, documentType, userRole) {
  if (error?.status === 403) {
    if (documentType === "cv") return "Only USER can upload CV.";
    if (documentType === "jd") return "Only HR can upload JD.";
  }

  if (error?.status === 401) return "Session expired. Please sign in again.";
  if (error?.status === 413) return "File is too large.";
  if (error?.status === 415) return "File type is not supported.";

  const role = String(userRole || "").toLowerCase();
  if (documentType === "cv" && role.includes("hr")) return "HR cannot upload CV.";
  if (documentType === "jd" && !role.includes("hr") && !role.includes("admin")) {
    return "You do not have permission to upload JD.";
  }

  return error?.message || "Cannot upload document.";
}
