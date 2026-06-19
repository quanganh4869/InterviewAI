const productionApiBaseUrl = "https://interviewai-production-ca54.up.railway.app";
const localApiBaseUrl = "http://localhost:8000";

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? productionApiBaseUrl : localApiBaseUrl);

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");
