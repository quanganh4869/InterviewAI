import React, { useEffect, useState } from "react";
import { Check, Crown, Star, Zap, Loader2 } from "lucide-react";
import { Button, Pill } from "../../../components/ui";
import { useUser } from "../../UserContext";
import { authedFetch } from "../../../api/authClient";
import { dispatchNotice } from "../../../utils/notice";

function formatLimit(value, unit) {
  if (value === null || value === undefined) return `Không giới hạn ${unit}`;
  return `${value} ${unit}`;
}

export function ServicePlansScreen() {
  const { user, fetchUser } = useUser();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadPlans = async () => {
    try {
      const data = await authedFetch("/v1_0/user/plans");
      if (Array.isArray(data)) {
        setPlans(data);
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSelectPlan = async (plan) => {
    setUpdatingId(plan.id);
    try {
      const updatedUser = await authedFetch(`/v1_0/user/plan/${plan.backendName.toLowerCase()}`, {
        method: "POST"
      });
      if (updatedUser) {
        fetchUser?.();
        dispatchNotice({
          tone: "success",
          title: "Gói dịch vụ",
          message: `Đã cập nhật lên gói ${plan.name} thành công.`,
        });
      }
    } catch (err) {
      dispatchNotice({
        tone: "danger",
        title: "Gói dịch vụ",
        message: err.message || "Không thể thay đổi gói dịch vụ.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="text-sm font-medium" style={{ color: "var(--text-soft)" }}>Đang tải danh sách gói...</span>
      </div>
    );
  }

  // Map backend plans to display objects
  const planData = plans.map(p => {
    const nameUpper = String(p.name).toUpperCase();
    const isCurrent = user?.plan_id === p.id || (nameUpper === "FREE" && !user?.plan_id);
    
    let displayName = "Miễn phí";
    let displayPrice = "0đ/tháng";
    let icon = Zap;
    let features = ["2 buổi phỏng vấn luyện tập/tháng", "Phản hồi phân tích cơ bản", "Lưu lịch sử phỏng vấn"];
    let accent = "from-slate-100 to-slate-50";

    if (nameUpper === "PRO") {
      displayName = "Pro";
      displayPrice = new Intl.NumberFormat("vi-VN").format(p.price) + "đ/tháng";
      icon = Crown;
      features = ["10 buổi phỏng vấn luyện tập/tháng", "Đối sánh CV chuyên sâu", "Nhận rubrics chi tiết"];
      accent = "from-blue-100 to-cyan-100";
    } else if (nameUpper === "ULTRA") {
      displayName = "Ultra";
      displayPrice = new Intl.NumberFormat("vi-VN").format(p.price) + "đ/tháng";
      icon = Star;
      features = ["Luyện tập không giới hạn", "Tải báo cáo chi tiết không giới hạn", "Hỗ trợ ưu tiên 24/7"];
      accent = "from-purple-100 to-indigo-100";
    }

    return {
      id: p.id,
      name: displayName,
      backendName: p.name,
      price: displayPrice,
      features: [
        formatLimit(p.practice_sessions_per_day, "phiên luyện tập/ngày"),
        formatLimit(p.cv_upload_limit, "CV"),
        formatLimit(p.jd_upload_limit, "JD"),
      ],
      icon,
      accent,
      current: isCurrent,
      recommended: nameUpper === "PRO",
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>
          Gói dịch vụ
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
          Chọn gói phù hợp với nhu cầu luyện phỏng vấn và phân tích hồ sơ.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {planData.map((plan) => {
          const Icon = plan.icon;
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-5 transition hover:shadow-md ${
                plan.recommended ? "border-blue-600 shadow-md" : ""
              }`}
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: plan.recommended ? "#2563eb" : "var(--border)",
              }}
            >
              {plan.recommended && (
                <Pill tone="info" className="absolute right-4 top-4">Khuyên dùng</Pill>
              )}

              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={22} />
              </div>

              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                {plan.name}
              </h3>
              <p className="mt-1 text-2xl font-black" style={{ color: "var(--text)" }}>
                {plan.price}
              </p>

              <ul className="my-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm" style={{ color: "var(--text)" }}>
                    <Check size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.recommended ? "primary" : plan.current ? "ghost" : "secondary"}
                className="w-full"
                disabled={plan.current || updatingId !== null}
                onClick={() => handleSelectPlan(plan)}
              >
                {updatingId === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : plan.current ? (
                  "Gói hiện tại"
                ) : (
                  "Chọn gói"
                )}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
