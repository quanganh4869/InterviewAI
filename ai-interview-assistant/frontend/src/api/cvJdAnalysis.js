import { authedFetch } from "./authClient";

export async function analyzeCvJd({ cvDocumentId, jdText, jobPostingId }) {
  return authedFetch("/v1_0/cv-jd-analysis/analyze", {
    method: "POST",
    body: JSON.stringify({
      cv_document_id: Number(cvDocumentId),
      jd_text: jdText || null,
      job_posting_id: jobPostingId ? Number(jobPostingId) : null,
    }),
  });
}

export async function fetchCvJdAnalysisHistory({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return authedFetch(`/v1_0/cv-jd-analysis/history?${params.toString()}`);
}

export async function fetchCvJdAnalysisDetail({ analysisId }) {
  return authedFetch(`/v1_0/cv-jd-analysis/${analysisId}`);
}
