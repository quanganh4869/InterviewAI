import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, User, Bell, Search, Sun, Moon } from "lucide-react";
import { useUser } from "../../features/UserContext";
import { toggleStoredTheme, getStoredTheme, subscribeTheme } from "../../utils/themeController";
import "./Header.css";

const Header = () => {
  const { user, logout } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [theme, setTheme] = useState(getStoredTheme);
  const location = useLocation();

  useEffect(() => subscribeTheme(setTheme), []);

  const handleToggleTheme = () => {
    const nextTheme = toggleStoredTheme();
    setTheme(nextTheme);
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  // Close dropdown when clicking logout or navigation
  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  // Simplified title based on current screen
  const getPageTitle = () => {
    const query = new URLSearchParams(location.search);
    const screen = query.get("screen");
    switch (screen) {
      case "profileCv":
        return String(user?.role || "").toLowerCase().includes("hr")
          ? "Quản lý JD"
          : "Quản lý CV";
      case "jobMatch":
        return "Việc làm & Kết nối";
      case "interviewHistory":
        return "Lịch sử phỏng vấn";
      case "servicePlans":
        return "Gói dịch vụ";
      default:
        return "Tổng quan Dashboard";
    }
  };

  return (
    <header className="header-modern">
      <div className="header-left">
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      <div className="header-right">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Tìm kiếm nhanh..." />
        </div>

        <button className="icon-btn" title="Thông báo">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        <button className="icon-btn" onClick={handleToggleTheme} title="Đổi giao diện">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="user-dropdown">
          {user && (
            <div className={`profile-trigger ${isDropdownOpen ? 'active' : ''}`} onClick={toggleDropdown}>
              <div className="user-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="user-info-text">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role || "Ứng viên"}</span>
              </div>
            </div>
          )}

          <div className={`dropdown-menu ${isDropdownOpen ? 'is-open' : ''}`}>
            <Link to="/thong-tin-nguoi-dung" className="menu-item" onClick={() => setIsDropdownOpen(false)}>
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
