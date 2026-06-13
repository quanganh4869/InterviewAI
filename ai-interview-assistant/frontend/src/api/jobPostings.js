import { authedFetch } from "./authClient";

export async function fetchPublicJobPostings() {
  return authedFetch("/v1_0/job-postings/public");
}

export async function fetchJobPostingDetail({ postingId }) {
  return authedFetch(`/v1_0/job-postings/${postingId}`);
}

export async function fetchHrJobPostings() {
  return authedFetch("/v1_0/job-postings/hr");
}

export async function createJobPostingFromDocument({ jdDocumentId, publish = false }) {
  return authedFetch("/v1_0/job-postings/from-document", {
    method: "POST",
    body: JSON.stringify({ jd_document_id: Number(jdDocumentId), publish }),
  });
}

export async function publishJobPosting({ postingId }) {
  return authedFetch(`/v1_0/job-postings/${postingId}/publish`, { method: "PATCH" });
}

export async function closeJobPosting({ postingId }) {
  return authedFetch(`/v1_0/job-postings/${postingId}/close`, { method: "PATCH" });
}
