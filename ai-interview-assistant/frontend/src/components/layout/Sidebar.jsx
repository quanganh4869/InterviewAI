import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Video,
} from "lucide-react";
import { useUser } from "../../features/UserContext";
import "./Sidebar.css";

const MENU_BY_ROLE = {
  admin: [
    { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/admin/users", label: "Người dùng", icon: ShieldCheck },
    { path: "/admin/documents", label: "CV & JD", icon: FolderKanban },
    { path: "/admin/interviews", label: "Các cuộc phỏng vấn", icon: Video },
    { path: "/admin/plans", label: "Gói dịch vụ", icon: Sparkles },
  ],
  hr: [
    { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/dashboard?screen=profileCv", label: "JD", icon: FileText },
    { path: "/dashboard?screen=insights", label: "Ứng viên", icon: UsersRound },
    { path: "/dashboard?screen=interviewHistory", label: "Lịch sử", icon: History },
  ],
  user: [
    { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/dashboard?screen=profileCv", label: "CV", icon: FolderKanban },
    { path: "/dashboard?screen=jobMatch", label: "Việc làm", icon: BriefcaseBusiness },
    { path: "/dashboard?screen=interviewHistory", label: "Kết quả", icon: History },
    { path: "/dashboard?screen=servicePlans", label: "Gói dịch vụ", icon: Sparkles },
  ],
};

function getRoleKey(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("hr") || normalized.includes("recruiter")) return "hr";
  return "user";
}

const Sidebar = () => {
  const location = useLocation();
  const { user } = useUser();
  const roleKey = getRoleKey(user?.role);
  const menuItems = MENU_BY_ROLE[roleKey] || MENU_BY_ROLE.user;

  const isActive = (path) => {
    const currentPath = location.pathname;
    const currentParams = new URLSearchParams(location.search);
    const [itemPath, itemQuery = ""] = String(path).split("?");

    if (itemPath === "/luyen-tap/tao-moi" && currentPath.startsWith("/luyen-tap")) return true;
    if (itemPath !== currentPath) return false;
    if (!itemQuery && itemPath.startsWith("/admin")) return true;

    const itemParams = new URLSearchParams(itemQuery);
    const itemScreen = itemParams.get("screen");
    if (currentPath.startsWith("/dashboard/candidates") && itemScreen === "insights") {
      return true;
    }
    const currentScreen = currentParams.get("screen") || "overview";
    if (!itemScreen) return currentScreen === "overview";
    return currentScreen === itemScreen;
  };

  return (
    <aside className={`sidebar-modern role-${roleKey}`}>
      <div className="sidebar-header">
        <Link to="/" className="brand-link">
          <div className="brand-logo">AI</div>
          <span className="brand-name">
            Interview
            <small>{roleKey === "admin" ? "Admin" : roleKey === "hr" ? "HR" : "User"}</small>
          </span>
        </Link>
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            title={item.label}
          >
            <item.icon className="nav-icon" size={20} />
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
