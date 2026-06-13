import { authedFetch } from "./authClient";

export async function fetchAdminUsers({ role, search, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));

  return authedFetch(`/v1_0/admin/users?${params.toString()}`);
}

export async function updateAdminUserRole({ userId, role }) {
  return authedFetch(`/v1_0/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
