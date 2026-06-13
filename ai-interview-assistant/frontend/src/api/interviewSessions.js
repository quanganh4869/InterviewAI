import { authedFetch, authedRawFetch, parseApiResponse, authedUpload } from "./authClient";

export async function createInterviewSession({
  sessionType = "official",
  jobPostingId,
  cvDocumentId,
  analysisId,
  practiceConfig,
}) {
  return authedFetch("/v1_0/interview-sessions", {
    method: "POST",
    body: JSON.stringify({
      session_type: sessionType,
      job_posting_id: jobPostingId ? Number(jobPostingId) : null,
      cv_document_id: cvDocumentId ? Number(cvDocumentId) : null,
      analysis_id: analysisId ? Number(analysisId) : null,
      practice_config: practiceConfig || null,
    }),
  });
}

export async function generateInterviewQuestions({ sessionId }) {
  return authedFetch(`/v1_0/interview-sessions/${sessionId}/questions/generate`, {
    method: "POST",
  });
}

export async function fetchInterviewSession({ sessionId }) {
  return authedFetch(`/v1_0/interview-sessions/${sessionId}`);
}

export async function deleteInterviewSession({ sessionId }) {
  return authedFetch(`/v1_0/interview-sessions/${sessionId}`, {
    method: "DELETE",
    keepalive: true,
  });
}

export async function fetchMyInterviewSessions({ sessionType } = {}) {
  const query = sessionType ? `?session_type=${encodeURIComponent(sessionType)}` : "";
  return authedFetch(`/v1_0/interview-sessions/my${query}`);
}

export async function fetchHrInterviewSessions({ jobPostingId } = {}) {
  const query = jobPostingId ? `?job_posting_id=${encodeURIComponent(jobPostingId)}` : "";
  return authedFetch(`/v1_0/interview-sessions/hr${query}`);
}

export async function uploadInterviewAnswer({
  sessionId,
  questionId,
  audioBlob,
  videoBlob,
  durationSeconds,
  onProgress,
}) {
  const formData = new FormData();
  formData.append("question_id", String(questionId));
  if (durationSeconds != null) formData.append("duration_seconds", String(durationSeconds));
  
  const getExtension = (blob, defaultExt) => {
    if (!blob) return defaultExt;
    const type = blob.type || "";
    if (type.includes("mp4")) return "mp4";
    if (type.includes("webm")) return "webm";
    if (type.includes("ogg")) return "ogg";
    if (type.includes("wav")) return "wav";
    if (type.includes("aac")) return "aac";
    return defaultExt;
  };

  if (audioBlob) {
    const ext = getExtension(audioBlob, "webm");
    formData.append("audio", audioBlob, `answer-audio.${ext}`);
  }
  if (videoBlob) {
    const ext = getExtension(videoBlob, "webm");
    formData.append("video", videoBlob, `answer-video.${ext}`);
  }

  if (onProgress) {
    return authedUpload(`/v1_0/interview-sessions/${sessionId}/answers`, formData, onProgress);
  }

  return authedFetch(`/v1_0/interview-sessions/${sessionId}/answers`, {
    method: "POST",
    body: formData,
  });
}

export async function finishInterviewSession({ sessionId }) {
  return authedFetch(`/v1_0/interview-sessions/${sessionId}/finish`, {
    method: "POST",
    body: JSON.stringify({ force_evaluate: false }),
  });
}

export async function fetchInterviewReport({ sessionId }) {
  return authedFetch(`/v1_0/interview-sessions/${sessionId}/report`);
}

export async function createInterviewMediaObjectUrl(path) {
  const response = await authedRawFetch(path);
  if (!response.ok) {
    await parseApiResponse(response);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function compareInterviewSessions({ sessionIds }) {
  return authedFetch("/v1_0/interview-sessions/compare", {
    method: "POST",
    body: JSON.stringify({ session_ids: sessionIds }),
  });
}

