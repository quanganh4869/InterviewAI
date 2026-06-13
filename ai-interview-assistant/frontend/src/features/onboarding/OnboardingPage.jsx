import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authedFetch } from "../../api/authClient";
import {
  getAccessToken,
  getRoleHomePath,
  setOnboardingDone,
  syncUserSessionFromBackend,
} from "../../utils/authSession";
import OnboardingWizard from "./OnboardingWizard";

async function fetchCurrentUser(accessToken) {
  try {
    return await authedFetch("/v1_0/user/me");
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [initialRole, setInitialRole] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        navigate("/login", { replace: true });
        return;
      }

      const me = await fetchCurrentUser(accessToken);
      if (!me) {
        navigate("/login", { replace: true });
        return;
      }

      if (cancelled) return;

      const normalizedRole = syncUserSessionFromBackend(me);
      if (normalizedRole === "admin") {
        setOnboardingDone(true);
        navigate(getRoleHomePath(normalizedRole), { replace: true });
        return;
      }

      if (me.needs_role_plan_setup || !me.plan_id) {
        setOnboardingDone(false);
        setInitialRole(normalizedRole || "");
        setIsLoading(false);
        return;
      }

      setOnboardingDone(true);
      navigate(getRoleHomePath(normalizedRole), { replace: true });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <main className="onboarding-page flex min-h-screen items-center justify-center bg-[#f2f8ff] px-4 py-10">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang kiểm tra tài khoản...
        </div>
      </main>
    );
  }

  return <OnboardingWizard initialRole={initialRole} />;
}
