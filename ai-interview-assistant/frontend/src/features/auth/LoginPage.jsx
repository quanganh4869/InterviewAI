import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import {
  getRoleHomePath,
  saveAuthSession,
  setOnboardingDone,
  syncUserSessionFromBackend,
  getRefreshToken,
  clearAuthSession,
} from "../../utils/authSession";
import { useUser } from "../UserContext";
import { Button } from "../../components/ui";

function parseAccessTokenFromHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return params.get("access_token") || "";
}

function parseRefreshTokenFromHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return params.get("refresh_token") || "";
}

async function fetchCurrentUser(accessToken) {
  const response = await fetch(`${API_BASE_URL}/v1_0/user/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body?.data) {
    throw new Error(body?.message || "Không lấy được thông tin người dùng.");
  }

  return body.data;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const redirectLoginUrl = useMemo(
    () => `${API_BASE_URL}/v1_0/auth/login/google`,
    [],
  );

  const completeLogin = useCallback(
    async (accessToken, refreshToken = "") => {
      saveAuthSession({ accessToken, refreshToken });
      const me = await fetchCurrentUser(accessToken);
      const normalizedRole = syncUserSessionFromBackend(me);
      setUser(me);

      if (normalizedRole === "admin") {
        setOnboardingDone(true);
        navigate(getRoleHomePath(normalizedRole), { replace: true });
        return;
      }

      if (me?.needs_role_plan_setup || !me?.plan_id) {
        setOnboardingDone(false);
        navigate("/onboarding", { replace: true });
        return;
      }

      setOnboardingDone(true);
      navigate(getRoleHomePath(normalizedRole), { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tokenFromHash = parseAccessTokenFromHash(window.location.hash);
    const refreshTokenFromHash = parseRefreshTokenFromHash(window.location.hash);
    const query = new URLSearchParams(window.location.search);
    const callbackError = query.get("error") || query.get("error_code");

    if (callbackError) {
      setError(`Đăng nhập Google thất bại (${callbackError}).`);
    }

    if (!tokenFromHash) return;

    setIsLoading(true);
    setError("");

    completeLogin(tokenFromHash, refreshTokenFromHash)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Đăng nhập thất bại.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [completeLogin]);

  const handleGoogleRedirect = async () => {
    if (typeof window === "undefined") return;
    setError("");
    setIsLoading(true);

    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const response = await fetch(`${API_BASE_URL}/v1_0/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const body = await response.json().catch(() => null);
        if (response.ok && body?.success && body?.data?.access_token) {
          await completeLogin(body.data.access_token, body.data.refresh_token || refreshToken);
          return;
        }
      } catch (err) {
        console.error("Silent login using refresh token failed:", err);
      }
      clearAuthSession();
    }

    window.location.href = redirectLoginUrl;
  };

  return (
    <main className="login-page app-shell flex items-center justify-center px-4 py-12">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="login-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Sparkles className="h-5 w-5" />
        </div>

        <h1 className="text-center font-display text-2xl font-bold text-slate-900">
          Đăng nhập AI Interview Assistant
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Bấm nút bên dưới để đăng nhập Google.
        </p>

        <div className="mt-7">
          <Button
            type="button"
            onClick={handleGoogleRedirect}
            disabled={isLoading}
            isLoading={isLoading}
            className="w-full"
            size="lg"
          >
            Đăng nhập bằng Google
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </motion.section>
    </main>
  );
}
