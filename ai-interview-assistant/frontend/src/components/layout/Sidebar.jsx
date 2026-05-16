import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  BriefcaseBusiness,
  History,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "../../features/UserContext";
import "./Sidebar.css";

const BASE_MENU_ITEMS = [
  { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { path: "/dashboard?screen=profileCv", label: "CV & JD", icon: FolderKanban },
  { path: "/dashboard?screen=jobMatch", label: "Việc làm", icon: BriefcaseBusiness },
  { path: "/dashboard?screen=interviewHistory", label: "Lịch sử", icon: History },
  { path: "/dashboard?screen=servicePlans", label: "Nâng cấp", icon: Sparkles },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useUser();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const normalizedRole = String(user?.role || "").toLowerCase();
  const isRecruiter =
    normalizedRole.includes("hr") || normalizedRole.includes("recruiter");

  const menuItems = React.useMemo(
    () =>
      BASE_MENU_ITEMS.map((item) =>
        item.path === "/dashboard?screen=profileCv"
          ? { ...item, label: isRecruiter ? "Quản lý JD" : "Quản lý CV" }
          : item,
      ),
    [isRecruiter],
  );

  const isActive = (path) => {
    const currentPath = location.pathname;
    const currentParams = new URLSearchParams(location.search);

    const [itemPath, itemQuery = ""] = String(path).split("?");
    if (itemPath !== currentPath) return false;

    const itemParams = new URLSearchParams(itemQuery);
    const itemScreen = itemParams.get("screen");
    const currentScreen = currentParams.get("screen") || "overview";

    if (!itemScreen) return currentScreen === "overview";
    return currentScreen === itemScreen;
  };

  return (
    <aside className={`sidebar-modern ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <Link to="/" className="brand-link">
          <div className="brand-logo">AI</div>
          {!isCollapsed && <span className="brand-name">Interview Assistant</span>}
        </Link>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            title={item.label}
          >
            <item.icon className="nav-icon" size={20} />
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
