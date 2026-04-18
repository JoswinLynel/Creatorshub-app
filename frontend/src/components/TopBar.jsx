import React, { useEffect, useState } from "react";
import { useAuth, usePlatform, useUI } from "@/lib/store";
import { has } from "@/lib/permissions";
import { Bell, ChevronDown, RefreshCw, Sun, Moon } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import toast from "react-hot-toast";

const TopBar = () => {
  const { user } = useAuth();
  const { platform, dateRange, setPlatform, setDateRange } = usePlatform();
  const { theme, toggleTheme } = useUI();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date().toISOString());

  const canSeePlatformData = has(user, "dashboard_view") || has(user, "analytics_view") || has(user, "posts_view");

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/connections/${platform}/sync`);
      setLastSync(new Date().toISOString());
      toast.success("Synced");
    } catch (e) {
      toast.error("Sync failed");
    } finally {
      setTimeout(() => setSyncing(false), 600);
    }
  };

  return (
    <div className="h-12 border-b border-edge bg-surface-secondary/60 backdrop-blur flex items-center px-3 md:px-5 gap-3 shrink-0">
      {/* Platform tabs */}
      {canSeePlatformData && (
        <div className="flex items-center gap-0.5 bg-surface-tertiary rounded-lg p-0.5" data-testid="platform-switcher">
          <button
            data-testid="platform-instagram"
            onClick={() => setPlatform("instagram")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] transition ${
              platform === "instagram" ? "bg-surface-secondary text-white shadow-sm" : "text-ink-secondary hover:text-ink"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ig" />
            Instagram
          </button>
          <button
            data-testid="platform-linkedin"
            onClick={() => setPlatform("linkedin")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] transition ${
              platform === "linkedin" ? "bg-surface-secondary text-white shadow-sm" : "text-ink-secondary hover:text-ink"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-li" />
            LinkedIn
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Date range */}
      {canSeePlatformData && (
        <div className="relative hidden sm:block">
          <select
            data-testid="date-range-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="appearance-none bg-surface-tertiary border border-edge text-[12.5px] text-ink-secondary pl-3 pr-7 py-1.5 rounded-md hover:text-ink transition"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 top-2 pointer-events-none text-ink-tertiary" />
        </div>
      )}

      {/* Sync indicator */}
      {canSeePlatformData && (
        <button
          onClick={handleSync}
          data-testid="sync-button"
          className="hidden sm:flex items-center gap-1.5 text-[12px] text-ink-secondary hover:text-ink px-2 py-1 rounded-md hover:bg-surface-tertiary transition"
          title={`Last synced ${relativeTime(lastSync)}`}
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
          Live
        </button>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        data-testid="theme-toggle"
        className="p-1.5 rounded-md text-ink-secondary hover:text-ink hover:bg-surface-tertiary transition"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Bell */}
      <button
        data-testid="notifications-button"
        className="relative p-1.5 rounded-md text-ink-secondary hover:text-ink hover:bg-surface-tertiary transition"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>
    </div>
  );
};

export default TopBar;
