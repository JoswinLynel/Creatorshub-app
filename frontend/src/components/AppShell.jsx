import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Home, BarChart3, FileText, CheckSquare, Calendar as CalendarIcon, PlayCircle,
  Handshake, Sparkles, Image, Users, Settings as SettingsIcon, LogOut, ChevronsLeft, ChevronsRight,
  Bell, Link2,
} from "lucide-react";
import { useAuth, useUI, usePlatform } from "@/lib/store";
import { has, ROLE_INFO } from "@/lib/permissions";
import { initials, avatarColor, relativeTime } from "@/lib/format";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";

const NAV = [
  { section: "Overview", items: [
    { label: "Dashboard", to: "/dashboard", icon: Home, permission: "dashboard_view" },
    { label: "Analytics", to: "/analytics", icon: BarChart3, permission: "analytics_view" },
    { label: "Posts", to: "/posts", icon: FileText, permission: "posts_view" },
  ]},
  { section: "Productivity", items: [
    { label: "Tasks", to: "/tasks", icon: CheckSquare, permission: "tasks_view", badgeKey: "overdue", badgeColor: "bg-red-500/20 text-red-400 border-red-500/30" },
    { label: "Calendar", to: "/calendar", icon: CalendarIcon, permission: "calendar_view", badgeKey: "today_events", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  ]},
  { section: "Growth", items: [
    { label: "Automations", to: "/automations", icon: PlayCircle, permission: "automations_view" },
    { label: "Brand Deals", to: "/brand-deals", icon: Handshake, permission: "brand_deals_view" },
    { label: "AI Insights", to: "/ai-insights", icon: Sparkles, permission: "ai_insights_view", badgeKey: "insights_unread", badgeColor: "bg-brand/20 text-brand border-brand/40" },
  ]},
  { section: "Workspace", items: [
    { label: "Media Vault", to: "/media-vault", icon: Image, permission: "media_vault_view" },
    { label: "Connections", to: "/connections", icon: Link2 },
    { label: "Team", to: "/team", icon: Users, permission: "team_view", badgeKey: "team", badgeColor: "bg-brand/20 text-brand border-brand/40" },
    { label: "Settings", to: "/settings", icon: SettingsIcon, permission: "settings_view" },
  ]},
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUI();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ overdue: 0, today_events: 0, team: 0, insights_unread: 0 });

  useEffect(() => {
    let alive = true;
    const fetch = () => api.get("/nav/counts").then(({ data }) => alive && setCounts(data)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const roleInfo = user?.role === "owner"
    ? { label: "Owner", color: "bg-brand/20 text-brand border-brand/40" }
    : ROLE_INFO[user?.role] || { label: user?.role, color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" };

  const visibleSections = NAV
    .map(sec => ({ ...sec, items: sec.items.filter(i => !i.permission || has(user, i.permission)) }))
    .filter(sec => sec.items.length > 0);

  return (
    <aside
      data-testid="sidebar"
      className="hidden md:flex flex-col border-r border-edge bg-surface-secondary transition-all duration-150 ease-out"
      style={{ width: collapsed ? 56 : 200 }}
    >
      {/* Logo */}
      <div className={`flex items-center h-12 px-3 border-b border-edge ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#C13584)" }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-[15px] font-medium tracking-tight">CreatorHub</span>
          </div>
        )}
        <button
          data-testid="sidebar-toggle"
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-surface-tertiary text-ink-tertiary hover:text-ink transition"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {visibleSections.map((sec) => (
          <div key={sec.section}>
            {!collapsed && (
              <div className="px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-tertiary mb-1.5">
                {sec.section}
              </div>
            )}
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const badgeVal = item.badgeKey ? counts[item.badgeKey] : 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={({ isActive }) =>
                      `group flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-2 py-1.5 rounded-md text-sm transition
                       ${isActive ? "bg-brand/15 text-white" : "text-ink-secondary hover:bg-surface-tertiary hover:text-ink"}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {badgeVal > 0 && (
                          <span className={`text-[10px] px-1.5 py-0 rounded border ${item.badgeColor || "bg-brand/20 text-brand border-brand/40"}`}>
                            {badgeVal}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-edge p-2">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} px-1.5 py-1.5 rounded-md`}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium text-white shrink-0"
            style={{ background: avatarColor(user?.email || "") }}
          >
            {initials(user?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{user?.name}</div>
              <div className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${roleInfo.color}`}>
                {roleInfo.label}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              data-testid="logout-button"
              onClick={() => { logout(); navigate("/login"); }}
              className="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-tertiary"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

const MobileTabBar = () => {
  const { user } = useAuth();
  const items = [
    { label: "Dashboard", to: "/dashboard", icon: Home, permission: "dashboard_view" },
    { label: "Analytics", to: "/analytics", icon: BarChart3, permission: "analytics_view" },
    { label: "Tasks", to: "/tasks", icon: CheckSquare, permission: "tasks_view" },
    { label: "Calendar", to: "/calendar", icon: CalendarIcon, permission: "calendar_view" },
    { label: "Team", to: "/team", icon: Users, permission: "team_view" },
  ].filter((i) => has(user, i.permission)).slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-secondary border-t border-edge">
      <div className="grid grid-cols-5">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 gap-0.5 text-[10px] ${isActive ? "text-white" : "text-ink-tertiary"}`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

const AppShell = () => {
  return (
    <div className="h-screen flex bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
};

export default AppShell;
