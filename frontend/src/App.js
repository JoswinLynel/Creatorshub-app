import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth, useUI } from "@/lib/store";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ChangePassword from "@/pages/ChangePassword";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Posts from "@/pages/Posts";
import Tasks from "@/pages/Tasks";
import CalendarPage from "@/pages/CalendarPage";
import Team from "@/pages/Team";
import AIInsights from "@/pages/AIInsights";
import BrandDeals from "@/pages/BrandDeals";
import Automations from "@/pages/Automations";
import Connections from "@/pages/Connections";
import MediaVault from "@/pages/MediaVault";
import Settings from "@/pages/Settings";
import NoAccess from "@/pages/NoAccess";
import { has } from "@/lib/permissions";

const ProtectedRoute = ({ children, permission }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (permission && !has(user, permission)) return <Navigate to="/no-access" replace />;
  return children;
};

const RedirectIfAuthed = ({ children }) => {
  const { user } = useAuth();
  if (user && user.must_change_password) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const HomeRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  // Role-based default landing
  if (has(user, "dashboard_view")) return <Navigate to="/dashboard" replace />;
  if (has(user, "analytics_view")) return <Navigate to="/analytics" replace />;
  if (has(user, "posts_view")) return <Navigate to="/posts" replace />;
  if (has(user, "tasks_view")) return <Navigate to="/tasks" replace />;
  return <Navigate to="/no-access" replace />;
};

function App() {
  const { theme } = useUI();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [theme]);
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: "14px",
            padding: "12px 16px",
            borderRadius: "10px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#1a1a1a" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#1a1a1a" } },
        }}
      />
      <Routes>
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<HomeRoute />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard" element={<ProtectedRoute permission="dashboard_view"><Dashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute permission="analytics_view"><Analytics /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute permission="posts_view"><Posts /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute permission="tasks_view"><Tasks /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute permission="calendar_view"><CalendarPage /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute permission="team_view"><Team /></ProtectedRoute>} />
          <Route path="/ai-insights" element={<ProtectedRoute permission="ai_insights_view"><AIInsights /></ProtectedRoute>} />
          <Route path="/brand-deals" element={<ProtectedRoute permission="brand_deals_view"><BrandDeals /></ProtectedRoute>} />
          <Route path="/automations" element={<ProtectedRoute permission="automations_view"><Automations /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
          <Route path="/media-vault" element={<ProtectedRoute permission="media_vault_view"><MediaVault /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute permission="settings_view"><Settings /></ProtectedRoute>} />
          <Route path="/no-access" element={<NoAccess />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
