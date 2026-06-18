import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { MainLayout } from "../../../components/layout";
import { Button, PageHeader } from "../../../components/ui";
import { fetchAdminPlans, updateAdminPlan } from "../../../api/adminUsers";
import { dispatchNotice } from "../../../utils/notice";

function normalizePlanForm(plan) {
  return {
    price: plan.price ?? 0,
    description: plan.description || "",
    practice_sessions_per_day: plan.practice_sessions_per_day ?? "",
    cv_upload_limit: plan.cv_upload_limit ?? "",
    jd_upload_limit: plan.jd_upload_limit ?? "",
  };
}

function normalizeLimit(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [forms, setForms] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminPlans();
      const items = Array.isArray(data) ? data : [];
      setPlans(items);
      setForms(Object.fromEntries(items.map((plan) => [plan.id, normalizePlanForm(plan)])));
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Gói dịch vụ",
        message: error?.message || "Không thể tải danh sách gói.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const updateField = (planId, field, value) => {
    setForms((current) => ({
      ...current,
      [planId]: {
        ...(current[planId] || {}),
        [field]: value,
      },
    }));
  };

  const savePlan = async (plan) => {
    const form = forms[plan.id] || normalizePlanForm(plan);
    setSavingId(plan.id);
    try {
      await updateAdminPlan({
        planId: plan.id,
        payload: {
          price: Number(form.price || 0),
          description: form.description || null,
          practice_sessions_per_day: normalizeLimit(form.practice_sessions_per_day),
          cv_upload_limit: normalizeLimit(form.cv_upload_limit),
          jd_upload_limit: normalizeLimit(form.jd_upload_limit),
        },
      });
      dispatchNotice({
        tone: "success",
        title: "Gói dịch vụ",
        message: `Đã cập nhật gói ${String(plan.name).toUpperCase()}.`,
      });
      await loadPlans();
    } catch (error) {
      dispatchNotice({
        tone: "danger",
        title: "Gói dịch vụ",
        message: error?.message || "Không thể cập nhật gói.",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="role-workspace admin space-y-5">
        <section className="role-hero">
          <div className="role-hero-content">
            <PageHeader
              eyebrow="Admin"
              title="Quản lý gói dịch vụ"
              meta="Chỉnh giá và hạn mức để triển khai mô hình thu phí."
            />
            <div className="role-hero-icon">
              <Sparkles size={22} />
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-semibold text-[var(--color-text-muted)]">Đang tải gói dịch vụ...</span>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const form = forms[plan.id] || normalizePlanForm(plan);
              return (
                <article key={plan.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Gói</p>
                    <h3 className="text-xl font-black text-[var(--color-text)]">{String(plan.name).toUpperCase()}</h3>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Giá / tháng</span>
                      <input
                        type="number"
                        min="0"
                        className="ds-input mt-1.5 w-full px-3 py-2"
                        value={form.price}
                        onChange={(event) => updateField(plan.id, "price", event.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Mô tả</span>
                      <textarea
                        className="ds-input mt-1.5 min-h-20 w-full px-3 py-2"
                        value={form.description}
                        onChange={(event) => updateField(plan.id, "description", event.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Phiên luyện tập / ngày</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Để trống = không giới hạn"
                        className="ds-input mt-1.5 w-full px-3 py-2"
                        value={form.practice_sessions_per_day}
                        onChange={(event) => updateField(plan.id, "practice_sessions_per_day", event.target.value)}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Số CV</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Không giới hạn"
                          className="ds-input mt-1.5 w-full px-3 py-2"
                          value={form.cv_upload_limit}
                          onChange={(event) => updateField(plan.id, "cv_upload_limit", event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Số JD</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Không giới hạn"
                          className="ds-input mt-1.5 w-full px-3 py-2"
                          value={form.jd_upload_limit}
                          onChange={(event) => updateField(plan.id, "jd_upload_limit", event.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  <Button className="mt-5 w-full" variant="primary" isLoading={savingId === plan.id} onClick={() => savePlan(plan)}>
                    <Save size={16} /> Lưu gói
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
