import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { RoleBadge } from "../ui";
import { useUser } from "../../features/UserContext";
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
  const [theme, setTheme] = useState(getStoredTheme);
  const location = useLocation();

  useEffect(() => subscribeTheme(setTheme), []);

  const handleToggleTheme = () => {
    setTheme(toggleStoredTheme());
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  return (
    <header className="header-modern">
      <div className="header-left">
        <span className="page-eyebrow">{getRoleLabel(user?.role)}</span>
        <h1 className="page-title">{getPageTitle(location, user?.role)}</h1>
      </div>

      <div className="header-right">
        <button className="icon-btn" onClick={handleToggleTheme} title="Đổi giao diện" aria-label="Đổi giao diện">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="user-dropdown">
          {user ? (
            <button
              type="button"
              className={`profile-trigger ${isDropdownOpen ? "active" : ""}`}
              onClick={() => setIsDropdownOpen((value) => !value)}
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
