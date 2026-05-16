import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import { getAccessToken, getAuthUser, clearAuthSession, syncUserSessionFromBackend } from "../utils/authSession";

const UserContext = createContext(null);

/**
 * Provider quản lý trạng thái người dùng toàn cục.
 * Giúp đồng bộ thông tin user từ backend và cung cấp cho toàn bộ ứng dụng.
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(getAuthUser());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Lấy thông tin người dùng hiện tại từ Backend.
   */
  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1_0/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await response.json().catch(() => null);
      
      if (response.ok && body?.success && body?.data) {
        setUser(body.data);
        syncUserSessionFromBackend(body.data);
      } else {
        // Nếu token hết hạn hoặc không hợp lệ (401), thực hiện đăng xuất
        if (response.status === 401) {
          clearAuthSession();
          setUser(null);
          window.location.href = "/";
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin người dùng:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Hàm đăng xuất không điều hướng (dùng nội bộ).
   */
  const logoutSilent = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  /**
   * Hàm đăng xuất và điều hướng về trang chủ.
   */
  const logout = useCallback(() => {
    logoutSilent();
    window.location.href = "/";
  }, [logoutSilent]);

  // Tự động tải lại thông tin user khi Provider được mount nếu đã có token
  useEffect(() => {
    if (getAccessToken()) {
      fetchUser();
    }
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, fetchUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Hook tùy chỉnh để sử dụng UserContext một cách dễ dàng.
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser phải được sử dụng trong UserProvider");
  }
  return context;
};
