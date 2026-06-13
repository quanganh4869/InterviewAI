import { authedFetch, authedRawFetch, parseApiResponse } from "./authClient";

async function directUploadDocument({ documentType, formData }) {
  return authedFetch(`/v1_0/document/upload/${documentType}`, {
    method: "POST",
    body: formData,
  });
}

function shouldUseLocalContentFallback(error) {
  return String(error?.message || "").includes("STORAGE_STRATEGY=r2");
}

async function createLocalDocumentObjectUrl({ documentId, imageOnly }) {
  const query = imageOnly ? "?image_only=true" : "";
  const response = await authedRawFetch(`/v1_0/document/${documentId}/content${query}`, {
    method: "GET",
  });
  if (!response.ok) {
    return parseApiResponse(response);
  }
  const blob = await response.blob();
  return {
    document_id: documentId,
    download_url: URL.createObjectURL(blob),
    expires_in: null,
  };
}

export async function fetchMyDocuments({ documentType } = {}) {
  const query = documentType
    ? `?document_type=${encodeURIComponent(documentType)}`
    : "";
  return authedFetch(`/v1_0/document${query}`, { method: "GET" });
}

export async function uploadCvDocument({ file, targetRole }) {
  if (!file) {
    throw new Error("Please select a CV file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (targetRole) {
    formData.append("target_role", targetRole);
  }

  return directUploadDocument({
    documentType: "cv",
    formData,
  });
}

export async function uploadJdDocument({ title, company, summary, file }) {
  if (!title?.trim()) {
    throw new Error("Please enter JD title.");
  }
  if (!file) {
    throw new Error("Please select a JD file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title.trim());
  if (company) {
    formData.append("company", company);
  }
  if (summary) {
    formData.append("summary", summary);
  }

  return directUploadDocument({
    documentType: "jd",
    formData,
  });
}

export async function createDocumentDownloadUrl({ documentId, expiresIn }) {
  try {
    const access = await authedFetch(`/v1_0/document/${documentId}/access-url`, {
      method: "POST",
      body: JSON.stringify({
        expires_in: expiresIn || null,
        image_only: false,
      }),
    });
    if (access?.download_mode === "local" || !access?.download_url) {
      return createLocalDocumentObjectUrl({ documentId, imageOnly: false });
    }
    return access;
  } catch (error) {
    if (!shouldUseLocalContentFallback(error)) throw error;
    return createLocalDocumentObjectUrl({ documentId, imageOnly: false });
  }
}

export async function createDocumentImageUrl({ documentId, expiresIn }) {
  try {
    const access = await authedFetch(`/v1_0/document/${documentId}/access-url`, {
      method: "POST",
      body: JSON.stringify({
        expires_in: expiresIn || null,
        image_only: true,
      }),
    });
    if (access?.download_mode === "local" || !access?.download_url) {
      return createLocalDocumentObjectUrl({ documentId, imageOnly: true });
    }
    return access;
  } catch (error) {
    if (!shouldUseLocalContentFallback(error)) throw error;
    return createLocalDocumentObjectUrl({ documentId, imageOnly: true });
  }
}

export async function deleteDocument({ documentId }) {
  return authedFetch(`/v1_0/document/${documentId}`, { method: "DELETE" });
}

export async function updateDocument({ documentId, payload }) {
  return authedFetch(`/v1_0/document/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload || {}),
  });
}

export async function parseCvDocument({ documentId }) {
  return authedFetch(`/v1_0/document/${documentId}/cv-parse`, { method: "GET" });
}

export async function matchCvWithJdText({ cvDocumentId, jdText }) {
  return authedFetch("/v1_0/document/match-score", {
    method: "POST",
    body: JSON.stringify({
      cv_document_id: cvDocumentId,
      jd_text: jdText,
    }),
  });
}
