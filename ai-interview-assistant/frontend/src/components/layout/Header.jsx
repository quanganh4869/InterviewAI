import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Sun, User } from "lucide-react";
import { RoleBadge } from "../ui";
import { useUser } from "../../features/UserContext";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../../api";
import { dispatchNotice } from "../../utils/notice";
import { getStoredTheme, subscribeTheme, toggleStoredTheme } from "../../utils/themeController";
import "./Header.css";

const SCREEN_TITLES = {
  cvJdAnalysis: "So sánh CV/JD",
  overview: "Tổng quan",
  profileCv: "CV & JD",
  jobMatch: "Việc làm phù hợp",
  interviewHistory: "Kết quả phỏng vấn",
  insights: "Ứng viên",
  servicePlans: "Gói dịch vụ",
};

function getRoleLabel(role) {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole.includes("admin")) return "Admin";
  if (normalizedRole.includes("hr") || normalizedRole.includes("recruiter")) return "HR";
  return "User";
}

function getPageTitle(location, role) {
  const normalizedRole = String(role || "").toLowerCase();
  const isHr = normalizedRole.includes("hr") || normalizedRole.includes("recruiter");

  if (location.pathname === "/admin/users") return "Quản lý người dùng";
  if (location.pathname === "/admin/documents") return "Quản lý CV & JD";
  if (location.pathname === "/admin/match") return "Đối chiếu CV/JD";
  if (location.pathname === "/luyen-tap/tao-moi") return "Tạo phiên luyện tập";
  if (location.pathname.startsWith("/luyen-tap/")) return "Luyện phỏng vấn AI";

  const query = new URLSearchParams(location.search);
  const screen = query.get("screen") || "overview";
  if (screen === "profileCv") {
    if (isHr) return "Quản lý JD";
    if (normalizedRole.includes("admin")) return "Quản lý CV & JD";
    return "Hồ sơ CV";
  }
  if (screen === "jobMatch" && isHr) return "Ứng viên";
  return SCREEN_TITLES[screen] || "Tổng quan";
}

const Header = () => {
  const { user, logout } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(getStoredTheme);
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedRole = String(user?.role || "").toLowerCase();
  const canUseNotifications = normalizedRole.includes("hr") || normalizedRole.includes("recruiter") || normalizedRole.includes("admin");

  useEffect(() => subscribeTheme(setTheme), []);

  const loadNotifications = React.useCallback(async ({ showPopup = false } = {}) => {
    if (!user?.id || !canUseNotifications) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const data = await fetchNotifications({ limit: 10 });
      const items = data?.items || [];
      setNotifications(items);
      setUnreadCount(data?.unread_count || 0);

      const latestUnread = items.find((item) => !item.is_read);
      if (showPopup && latestUnread) {
        const popupKey = `aiia-notification-seen-${latestUnread.id}`;
        if (!window.sessionStorage.getItem(popupKey)) {
          window.sessionStorage.setItem(popupKey, "1");
          dispatchNotice({
            tone: "info",
            title: latestUnread.title,
            message: latestUnread.body || "Bạn có thông báo mới.",
          });
        }
      }
    } catch (error) {
      console.warn("Unable to load notifications:", error);
    }
  }, [canUseNotifications, user?.id]);

  useEffect(() => {
    loadNotifications({ showPopup: true });
  }, [loadNotifications]);

  const handleToggleTheme = () => {
    setTheme(toggleStoredTheme());
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const handleOpenNotification = async (notification) => {
    setIsNotificationOpen(false);
    if (!notification.is_read) {
      try {
        await markNotificationRead({ notificationId: notification.id });
        loadNotifications();
      } catch (error) {
        console.warn("Unable to mark notification as read:", error);
      }
    }
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      console.warn("Unable to mark notifications as read:", error);
    }
  };

  return (
    <header className="header-modern">
      <div className="header-left">
        <span className="page-eyebrow">{getRoleLabel(user?.role)}</span>
        <h1 className="page-title">{getPageTitle(location, user?.role)}</h1>
      </div>

      <div className="header-right">
        {canUseNotifications ? (
          <div className="notification-dropdown">
            <button
              className={`icon-btn ${isNotificationOpen ? "active" : ""}`}
              onClick={() => {
                setIsNotificationOpen((value) => !value);
                setIsDropdownOpen(false);
                loadNotifications();
              }}
              title="Thông báo"
              aria-label="Thông báo"
              aria-expanded={isNotificationOpen}
            >
              <Bell size={19} />
              {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
            </button>

            <div className={`notification-menu ${isNotificationOpen ? "is-open" : ""}`}>
              <div className="notification-menu-head">
                <strong>Thông báo</strong>
                {unreadCount > 0 ? (
                  <button type="button" onClick={handleMarkAllRead}>
                    Đánh dấu đã đọc
                  </button>
                ) : null}
              </div>
              {notifications.length ? (
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notification-item ${notification.is_read ? "" : "unread"}`}
                      onClick={() => handleOpenNotification(notification)}
                    >
                      <span>{notification.title}</span>
                      {notification.body ? <small>{notification.body}</small> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="notification-empty">Chưa có thông báo.</div>
              )}
            </div>
          </div>
        ) : null}

        <button className="icon-btn" onClick={handleToggleTheme} title="Đổi giao diện" aria-label="Đổi giao diện">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="user-dropdown">
          {user ? (
            <button
              type="button"
              className={`profile-trigger ${isDropdownOpen ? "active" : ""}`}
              onClick={() => {
                setIsDropdownOpen((value) => !value);
                setIsNotificationOpen(false);
              }}
              aria-expanded={isDropdownOpen}
            >
              <div className="user-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name || "Người dùng"} referrerPolicy="no-referrer" />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="user-info-text">
                <span className="user-name">{user.name || user.email || "Người dùng"}</span>
                <RoleBadge role={user.role} className="user-role" />
              </div>
            </button>
          ) : null}

          <div className={`dropdown-menu ${isDropdownOpen ? "is-open" : ""}`}>
            <Link
              to="/thong-tin-nguoi-dung"
              className="menu-item"
              onClick={() => setIsDropdownOpen(false)}
            >
              <User size={16} /> Thông tin cá nhân
            </Link>
            <button onClick={handleLogout} className="menu-item logout">
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
