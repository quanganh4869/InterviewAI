import { API_BASE_URL } from "../config/api";
import {
  clearAccessTokenOnly,
  getAccessToken,
  getRefreshToken,
  saveAuthSession,
  syncUserSessionFromBackend,
} from "../utils/authSession";

let refreshPromise = null;
let isRedirecting = false;

export function redirectToLanding() {
  clearAccessTokenOnly();
  if (typeof window !== "undefined" && !isRedirecting) {
    isRedirecting = true;
    window.location.href = "/";
  }
}

export function getAuthTokenOrThrow() {
  const token = getAccessToken();
  if (!token) {
    redirectToLanding();
    throw new Error("You are not logged in. Please sign in again.");
  }
  return token;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Missing refresh token.");
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/v1_0/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success || !body?.data?.access_token) {
          throw new Error(body?.message || "Session expired.");
        }
        saveAuthSession({
          accessToken: body.data.access_token,
          refreshToken: body.data.refresh_token,
        });
        if (body.data.user) {
          syncUserSessionFromBackend(body.data.user);
        }
        return body.data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function withAuthHeader(options = {}, token = getAuthTokenOrThrow()) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { ...options, headers };
}

export async function authedRawFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  let response = await fetch(url, withAuthHeader(options));

  if (response.status !== 401) {
    return response;
  }

  try {
    const token = await refreshAccessToken();
    response = await fetch(url, withAuthHeader(options, token));
    return response;
  } catch {
    redirectToLanding();
    return response;
  }
}

export async function parseApiResponse(response) {
  const body = await response.json().catch(() => null);
  if (response.status === 401) {
    redirectToLanding();
    // Return a pending promise so the component's await halts gracefully and
    // doesn't trigger catch blocks/toasts while the browser redirects.
    return new Promise(() => {});
  }
  if (response.ok && body?.success) {
    return body.data;
  }
  const message = body?.message || body?.detail || "Request failed.";
  const error = new Error(message);
  error.status = response.status;
  error.body = body;
  throw error;
}

export async function authedFetch(path, options = {}) {
  const response = await authedRawFetch(path, options);
  return parseApiResponse(response);
}

export function authedUpload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const token = getAccessToken();
    if (!token) {
      redirectToLanding();
      reject(new Error("You are not logged in. Please sign in again."));
      return;
    }
    const xhr = new XMLHttpRequest();
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 401) {
        redirectToLanding();
        reject(new Error("Unauthorized session."));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body?.success) {
          resolve(body.data);
        } else {
          reject(new Error(body?.message || body?.detail || "Tải lên thất bại."));
        }
      } catch {
        reject(new Error("Lỗi xử lý phản hồi từ máy chủ."));
      }
    };

    xhr.onerror = () => reject(new Error("Lỗi kết nối mạng."));
    xhr.send(formData);
  });
}
