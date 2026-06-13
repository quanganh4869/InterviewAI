import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authedFetch } from "../api/authClient";
import {
  clearAuthSession,
  clearAccessTokenOnly,
  getAccessToken,
  getRefreshToken,
  getAuthUser,
  syncUserSessionFromBackend,
} from "../utils/authSession";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(getAuthUser());
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }

    setIsLoading(true);
    try {
      const data = await authedFetch("/v1_0/user/me");
      setUser(data);
      syncUserSessionFromBackend(data);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutSilent = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    logoutSilent();
    window.location.href = "/login";
  }, [logoutSilent]);

  const logoutToLanding = useCallback(() => {
    clearAccessTokenOnly();
    setUser(null);
    window.location.href = "/";
  }, []);

  useEffect(() => {
    if (getAccessToken()) {
      fetchUser();
    }
  }, [fetchUser]);

  useEffect(() => {
    const checkTokenExpiry = () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const parts = refreshToken.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload && typeof payload.exp === 'number') {
              const expMs = payload.exp * 1000;
              if (Date.now() >= expMs) {
                console.warn("Session refresh token expired. Performing complete logout.");
                logout();
                return;
              }
            }
          }
        } catch (err) {
          // Ignore
        }
      }

      const accessToken = getAccessToken();
      if (accessToken) {
        try {
          const parts = accessToken.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload && typeof payload.exp === 'number') {
              const expMs = payload.exp * 1000;
              if (Date.now() >= expMs) {
                console.warn("Access token expired. Redirecting to landing page.");
                logoutToLanding();
                return;
              }
            }
          }
        } catch (err) {
          // Ignore
        }
      }
    };

    checkTokenExpiry();
    const timer = setInterval(checkTokenExpiry, 10000);
    return () => clearInterval(timer);
  }, [logout, logoutToLanding]);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, fetchUser, logout, logoutToLanding }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
