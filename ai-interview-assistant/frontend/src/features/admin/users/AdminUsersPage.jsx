import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, UsersRound, Plus, Pencil, Trash2, X, Calendar, Mail, FileText, Video, Download } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import {
  Button,
  DataTable,
  DataTableState,
  DataToolbar,
  EmptyState,
  PageHeader,
  RoleBadge,
  SearchBar,
  StatusBadge,
  ConfirmDialog,
} from "../../../components/ui";
import { fetchAdminUsers } from "../../../api";
import { authedFetch } from "../../../api/authClient";
import { dispatchNotice } from "../../../utils/notice";

const ROLE_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "user", label: "User" },
  { value: "HR", label: "HR" },
  { value: "admin", label: "Admin" },
];

const USER_COLUMNS = [
  { key: "user", label: "Người dùng" },
  { key: "email", label: "Email" },
  { key: "role", label: "Quyền" },
  { key: "plan", label: "Gói" },
  { key: "created", label: "Ngày tạo" },
];

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    plan_id: "",
    additional_practice_slots: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: "",
    email: "",
    role: "user",
    plan_id: "",
    additional_practice_slots: 0,
  });

  const handleInlineRoleChange = async (targetUser, newRole) => {
    setUpdatingUserId(targetUser.id);
    try {
      const body = {
        name: targetUser.name || null,
        email: targetUser.email || null,
        role: newRole,
        plan_id: targetUser.plan_id || null,
        additional_practice_slots: targetUser.additional_practice_slots || 0,
      };
      await authedFetch(`/v1_0/admin/users/${targetUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      dispatchNotice({
        tone: "success",
        title: "Quản trị",
        message: `Đã cập nhật quyền của ${targetUser.name || targetUser.email} thành ${newRole.toUpperCase()}.`,
      });
      loadUsers();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Cập nhật quyền",
        message: err.message || "Không thể cập nhật quyền.",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleInlinePlanChange = async (targetUser, newPlanId) => {
    setUpdatingUserId(targetUser.id);
    try {
      const parsedPlanId = newPlanId ? Number(newPlanId) : null;
      const body = {
        name: targetUser.name || null,
        email: targetUser.email || null,
        role: targetUser.role,
        plan_id: parsedPlanId,
        additional_practice_slots: targetUser.additional_practice_slots || 0,
      };
      await authedFetch(`/v1_0/admin/users/${targetUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const chosenPlan = plans.find((p) => p.id === parsedPlanId);
      dispatchNotice({
        tone: "success",
        title: "Quản trị",
        message: `Đã cập nhật gói của ${targetUser.name || targetUser.email} thành ${chosenPlan?.name?.toUpperCase() || "FREE"}.`,
      });
      loadUsers();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Cập nhật gói cước",
        message: err.message || "Không thể cập nhật gói cước.",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleViewUserDetails = async (targetUser) => {
    setIsLoadingDetails(true);
    setSelectedUserDetails(null);
    setShowDetailsModal(true);
    setIsEditingDetails(false);
    try {
      const data = await authedFetch(`/v1_0/admin/users/${targetUser.id}/details`);
      setSelectedUserDetails(data);
      setDetailsForm({
        name: data.name || "",
        email: data.email || "",
        role: data.role || "user",
        plan_id: data.plan_id || "",
        additional_practice_slots: data.additional_practice_slots || 0,
      });
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Chi tiết người dùng",
        message: err.message || "Không thể tải chi tiết người dùng.",
      });
      setShowDetailsModal(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDownloadDoc = async (docId) => {
    try {
      const res = await authedFetch(`/v1_0/document/${docId}/access-url`, {
        method: "POST",
        body: JSON.stringify({ image_only: false }),
      });
      if (res?.download_url) {
        window.open(res.download_url, "_blank");
      }
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Tải tài liệu",
        message: err.message || "Không thể lấy liên kết tải tài liệu.",
      });
    }
  };

  const params = useMemo(
    () => ({ role, search, page: 1, pageSize: 50 }),
    [role, search],
  );

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminUsers(params);
      setUsers(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Quản trị",
        message: error?.message || "Không thể tải danh sách người dùng.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [params]);

  // Load plans list
  useEffect(() => {
    authedFetch("/v1_0/user/plans")
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmitSearch = (event) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
  };

  const handleOpenCreateModal = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      plan_id: plans[0]?.id || "",
      additional_practice_slots: 0,
    });
    setShowCreateModal(true);
  };

  // Edit modal removed in favor of editing inside Details modal.

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.email) return;
    setIsSubmitting(true);
    try {
      const body = {
        name: formData.name || null,
        email: formData.email,
        role: formData.role,
        plan_id: formData.plan_id ? Number(formData.plan_id) : null,
        additional_practice_slots: Number(formData.additional_practice_slots || 0),
      };
      await authedFetch("/v1_0/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
      });
      dispatchNotice({ tone: "success", title: "Quản trị", message: "Đã thêm người dùng mới." });
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Thêm người dùng",
        message: err.message || "Không thể thêm người dùng mới.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUserDetails = async (e) => {
    e.preventDefault();
    if (!selectedUserDetails) return;
    setIsSubmitting(true);
    try {
      const body = {
        name: detailsForm.name || null,
        email: detailsForm.email || null,
        role: detailsForm.role,
        plan_id: detailsForm.plan_id ? Number(detailsForm.plan_id) : null,
        additional_practice_slots: Number(detailsForm.additional_practice_slots || 0),
      };
      await authedFetch(`/v1_0/admin/users/${selectedUserDetails.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      dispatchNotice({
        tone: "success",
        title: "Quản trị",
        message: `Đã cập nhật thông tin người dùng thành công.`,
      });
      setIsEditingDetails(false);
      const data = await authedFetch(`/v1_0/admin/users/${selectedUserDetails.id}/details`);
      setSelectedUserDetails(data);
      loadUsers();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Cập nhật người dùng",
        message: err.message || "Không thể cập nhật thông tin.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFromDetails = () => {
    if (!selectedUserDetails) return;
    setUserToDelete({
      id: selectedUserDetails.id,
      name: selectedUserDetails.name,
      email: selectedUserDetails.email,
    });
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      await authedFetch(`/v1_0/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      dispatchNotice({ tone: "success", title: "Quản trị", message: "Đã xóa người dùng khỏi hệ thống." });
      setUserToDelete(null);
      setShowDetailsModal(false);
      loadUsers();
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Xóa người dùng",
        message: err.message || "Không thể xóa người dùng.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="role-workspace admin space-y-5">
        <section className="role-hero">
          <div className="role-hero-content">
            <PageHeader
              eyebrow="Admin"
              title="Quản lý người dùng"
              meta="Thêm, sửa thông tin, xóa và phân quyền/gói dịch vụ cho tài khoản người dùng."
              actions={
                <div className="flex gap-4 items-center">
                  <Button variant="primary" onClick={handleOpenCreateModal} className="flex gap-2 items-center">
                    <Plus size={16} /> Thêm người dùng
                  </Button>
                  <div className="inline-flex items-center gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
                    <UsersRound className="h-5 w-5 text-[var(--color-text-muted)]" />
                    <div>
                      <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Tổng số</p>
                      <p className="text-lg font-extrabold text-[var(--color-text)]">{total}</p>
                    </div>
                  </div>
                </div>
              }
            />
            <div className="role-hero-icon">
              <ShieldCheck size={22} />
            </div>
          </div>
        </section>

        <DataToolbar>
          <form onSubmit={handleSubmitSearch} className="flex min-w-0 flex-1 gap-2">
            <SearchBar
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Tìm theo tên hoặc email"
              className="flex-1"
            />
            <Button type="submit" size="md">
              Tìm kiếm
            </Button>
          </form>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="ds-input w-full px-3 font-semibold md:w-44"
            aria-label="Lọc theo quyền"
          >
            {ROLE_FILTERS.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </DataToolbar>

        <DataTable columns={USER_COLUMNS}>
          {isLoading ? (
            <DataTableState colSpan={USER_COLUMNS.length}>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải người dùng...
              </span>
            </DataTableState>
          ) : null}

          {!isLoading && users.length === 0 ? (
            <DataTableState colSpan={USER_COLUMNS.length} className="p-4">
              <EmptyState title="Không tìm thấy người dùng phù hợp" />
            </DataTableState>
          ) : null}

          {!isLoading
            ? users.map((targetUser) => {
                return (
                  <tr key={targetUser.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue-100 text-sm font-bold text-blue-700">
                          {(targetUser.name || targetUser.email || "U").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[var(--color-text)]">
                            <button
                              type="button"
                              onClick={() => handleViewUserDetails(targetUser)}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left"
                              title="Xem chi tiết hoạt động"
                            >
                              {targetUser.name || "Chưa cập nhật"}
                            </button>
                          </p>
                          {targetUser.is_fixed_admin ? (
                            <p className="text-xs font-semibold text-blue-700">Admin mặc định</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-[var(--color-text-muted)]">{targetUser.email}</td>
                    <td>
                      <RoleBadge role={targetUser.role} />
                    </td>
                    <td>
                      <StatusBadge status="active" tone={targetUser.plan_name?.toUpperCase() === "FREE" ? "neutral" : "success"}>
                        {targetUser.plan_name?.toUpperCase() || "FREE"}
                      </StatusBadge>
                    </td>
                    <td className="text-[var(--color-text-muted)]">
                      {formatDate(targetUser.created_at)}
                    </td>
                  </tr>
                );
              })
            : null}
        </DataTable>
      </div>

      {/* Modal Thêm người dùng mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-[var(--color-text)] mb-4">Thêm người dùng mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Tên người dùng</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="ds-input w-full mt-1.5 px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Địa chỉ Email *</span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="ds-input w-full mt-1.5 px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Quyền hạn</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="ds-input w-full mt-1.5 px-3"
                  >
                    <option value="user">User</option>
                    <option value="HR">HR</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Gói cước</span>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    className="ds-input w-full mt-1.5 px-3"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Lượt phỏng vấn cộng thêm (Mỗi ngày)</span>
                <input
                  type="number"
                  min="0"
                  value={formData.additional_practice_slots}
                  onChange={(e) => setFormData({ ...formData, additional_practice_slots: parseInt(e.target.value) || 0 })}
                  placeholder="Ví dụ: 5"
                  className="ds-input w-full mt-1.5 px-3 py-2 font-bold"
                />
              </label>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Thêm tài khoản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận xóa người dùng */}
      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Xóa tài khoản người dùng?"
        message={
          <div className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa tài khoản <strong>{userToDelete?.name || userToDelete?.email}</strong> không?</p>
            <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
              ⚠️ CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn tài khoản cùng toàn bộ CV, JD, Phân tích, và lịch sử phỏng vấn của người dùng này khỏi hệ thống. Hành động này không thể hoàn tác.
            </p>
          </div>
        }
        confirmLabel="Xóa tài khoản"
        isSubmitting={isSubmitting}
        onCancel={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
      />

      {/* Modal Chi tiết người dùng */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative my-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-[var(--color-text)] mb-6 flex items-center gap-2">
              <UsersRound className="text-blue-600" /> Chi tiết hoạt động người dùng
            </h3>

            {isLoadingDetails ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">Đang tải thông tin chi tiết...</span>
              </div>
            ) : selectedUserDetails ? (
              <div className="space-y-6">
                {/* User Summary Card */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 grid gap-4 md:grid-cols-4 items-center">
                  {isEditingDetails ? (
                    <>
                      {/* Name & Email Inputs */}
                      <div className="md:col-span-2 space-y-3">
                        <label className="block">
                          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Tên người dùng</span>
                          <input
                            type="text"
                            value={detailsForm.name}
                            onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                            className="ds-input w-full mt-1 px-3 py-2 text-sm font-bold"
                            placeholder="Tên người dùng"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Địa chỉ Email</span>
                          <input
                            type="email"
                            value={detailsForm.email}
                            onChange={(e) => setDetailsForm({ ...detailsForm, email: e.target.value })}
                            className="ds-input w-full mt-1 px-3 py-2 text-sm"
                            placeholder="name@example.com"
                          />
                        </label>
                      </div>

                      {/* Role & Plan selects */}
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Quyền hạn</span>
                          <select
                            value={detailsForm.role}
                            onChange={(e) => setDetailsForm({ ...detailsForm, role: e.target.value })}
                            className="ds-input w-full mt-1 px-2.5 py-1.5 text-xs font-semibold bg-[var(--color-surface)] border-[var(--color-border)] rounded-[10px]"
                          >
                            <option value="user">User</option>
                            <option value="HR">HR</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Gói cước</span>
                          <select
                            value={detailsForm.plan_id || ""}
                            onChange={(e) => setDetailsForm({ ...detailsForm, plan_id: e.target.value })}
                            className="ds-input w-full mt-1 px-2.5 py-1.5 text-xs font-semibold bg-[var(--color-surface)] border-[var(--color-border)] rounded-[10px]"
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {/* Slots input */}
                      <div>
                        <label className="block">
                          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Lượt thêm/ngày</span>
                          <input
                            type="number"
                            min="0"
                            value={detailsForm.additional_practice_slots}
                            onChange={(e) => setDetailsForm({ ...detailsForm, additional_practice_slots: parseInt(e.target.value) || 0 })}
                            className="ds-input w-24 mt-1 px-3 py-2 text-sm font-bold"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Name & Email Read-Only */}
                      <div className="flex items-center gap-4 md:col-span-2">
                        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700">
                          {(selectedUserDetails.name || selectedUserDetails.email || "U").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-lg font-bold text-[var(--color-text)] truncate">{selectedUserDetails.name || "Chưa cập nhật"}</h4>
                          <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                            <Mail size={14} /> {selectedUserDetails.email}
                          </p>
                        </div>
                      </div>

                      {/* Role & Plan badges */}
                      <div>
                        <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Vai trò & Gói</p>
                        <div className="flex gap-2 items-center mt-1.5">
                          <RoleBadge role={selectedUserDetails.role} />
                          <StatusBadge status="active" tone={selectedUserDetails.plan_name?.toUpperCase() === "FREE" ? "neutral" : "success"}>
                            {selectedUserDetails.plan_name?.toUpperCase() || "FREE"}
                          </StatusBadge>
                        </div>
                      </div>

                      {/* Joined Date & Slots */}
                      <div className="space-y-1">
                        <div>
                          <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Lượt thêm/ngày</p>
                          <p className="text-sm font-bold text-[var(--color-text)] mt-0.5">
                            +{selectedUserDetails.additional_practice_slots || 0} lượt
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Ngày tham gia</p>
                          <p className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5 mt-0.5">
                            <Calendar size={14} className="text-[var(--color-text-muted)]" />
                            {formatDate(selectedUserDetails.created_at)}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-[var(--color-border)] rounded-xl p-4 text-center bg-[var(--color-surface)]">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Tổng số CV</p>
                    <p className="text-2xl font-black mt-1 text-blue-600">
                      {selectedUserDetails.documents?.filter(d => d.document_type === "CV").length || 0}
                    </p>
                  </div>
                  <div className="border border-[var(--color-border)] rounded-xl p-4 text-center bg-[var(--color-surface)]">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Tổng số JD</p>
                    <p className="text-2xl font-black mt-1 text-amber-600">
                      {selectedUserDetails.documents?.filter(d => d.document_type === "JD").length || 0}
                    </p>
                  </div>
                  <div className="border border-[var(--color-border)] rounded-xl p-4 text-center bg-[var(--color-surface)]">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Lượt phỏng vấn</p>
                    <p className="text-2xl font-black mt-1 text-purple-600">
                      {selectedUserDetails.interviews?.length || 0}
                    </p>
                  </div>
                  <div className="border border-[var(--color-border)] rounded-xl p-4 text-center bg-[var(--color-surface)]">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Điểm trung bình</p>
                    <p className="text-2xl font-black mt-1 text-emerald-600">
                      {selectedUserDetails.interviews?.filter(i => i.overall_score !== null).length > 0
                        ? `${Math.round(selectedUserDetails.interviews.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / selectedUserDetails.interviews.filter(i => i.overall_score !== null).length)}%`
                        : "N/A"
                      }
                    </p>
                  </div>
                </div>

                {/* Lists Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Documents Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                      <FileText size={16} className="text-blue-600" /> Danh sách tài liệu ({selectedUserDetails.documents?.length || 0})
                    </h4>
                    <div className="max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                      {selectedUserDetails.documents && selectedUserDetails.documents.length > 0 ? (
                        <table className="w-full text-sm border-collapse text-left">
                          <thead>
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs font-bold uppercase text-[var(--color-text-muted)]">
                              <th className="p-3">Tài liệu</th>
                              <th className="p-3">Loại</th>
                              <th className="p-3 text-right">Tải về</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUserDetails.documents.map((doc) => (
                              <tr key={doc.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                                <td className="p-3 font-semibold truncate max-w-[200px]" title={doc.file_name}>
                                  {doc.file_name}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[6px] ${doc.document_type === "CV" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                                    {doc.document_type}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleDownloadDoc(doc.id)}
                                    className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-blue-600 transition-colors"
                                    title="Tải tệp gốc"
                                  >
                                    <Download size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-8 text-center text-xs text-[var(--color-text-muted)]">Người dùng chưa tải lên tài liệu nào.</p>
                      )}
                    </div>
                  </div>

                  {/* Interview History Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                      <Video size={16} className="text-purple-600" /> Lịch sử phỏng vấn ({selectedUserDetails.interviews?.length || 0})
                    </h4>
                    <div className="max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                      {selectedUserDetails.interviews && selectedUserDetails.interviews.length > 0 ? (
                        <table className="w-full text-sm border-collapse text-left">
                          <thead>
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs font-bold uppercase text-[var(--color-text-muted)]">
                              <th className="p-3">Vị trí</th>
                              <th className="p-3">Điểm</th>
                              <th className="p-3 text-right">Xem báo cáo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUserDetails.interviews.map((session) => (
                              <tr key={session.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                                <td className="p-3 font-semibold truncate max-w-[200px]" title={session.job_posting_title || "Luyện tập tự do"}>
                                  {session.job_posting_title || (session.session_type === "practice" ? "Luyện tập tự do" : "Phỏng vấn chính thức")}
                                </td>
                                <td className="p-3 font-bold text-[var(--color-text)]">
                                  {session.overall_score !== null ? (
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-[6px] ${session.overall_score >= 70 ? "bg-emerald-50 text-emerald-700" : session.overall_score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                      {Math.round(session.overall_score)}%
                                    </span>
                                  ) : (
                                    <span className="text-xs text-[var(--color-text-muted)] font-normal">{session.status}</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {session.status === "completed" && session.overall_score !== null ? (
                                    <button
                                      onClick={() => {
                                        setShowDetailsModal(false);
                                        window.open(`/phong-van/${session.id}/ket-qua`, "_blank");
                                      }}
                                      className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline"
                                    >
                                      Báo cáo
                                    </button>
                                  ) : (
                                    <span className="text-xs text-[var(--color-text-muted)]">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="p-8 text-center text-xs text-[var(--color-text-muted)]">Người dùng chưa thực hiện cuộc phỏng vấn nào.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center p-8 text-sm text-[var(--color-text-muted)]">Không tìm thấy thông tin người dùng.</p>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
              {isEditingDetails ? (
                <>
                  <Button variant="ghost" onClick={() => setIsEditingDetails(false)} disabled={isSubmitting}>
                    Hủy
                  </Button>
                  <Button variant="primary" onClick={handleSaveUserDetails} isLoading={isSubmitting}>
                    Lưu thay đổi
                  </Button>
                </>
              ) : (
                <>
                  {selectedUserDetails && !selectedUserDetails.is_fixed_admin && (
                    <>
                      <Button variant="danger" onClick={handleDeleteFromDetails} disabled={isSubmitting}>
                        Xóa người dùng
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditingDetails(true)}>
                        Chỉnh sửa
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>
                    Đóng
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
