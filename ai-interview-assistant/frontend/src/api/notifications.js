import { authedFetch } from "./authClient";

export async function fetchNotifications({ unreadOnly = false, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unread_only", "true");
  if (limit) params.set("limit", String(limit));
  return authedFetch(`/v1_0/notifications?${params.toString()}`);
}

export async function markNotificationRead({ notificationId }) {
  return authedFetch(`/v1_0/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  return authedFetch("/v1_0/notifications/read-all", {
    method: "PATCH",
  });
}
