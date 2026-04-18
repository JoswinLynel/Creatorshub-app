import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./api";

export const useAuth = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("ch_access_token", data.access_token);
        localStorage.setItem("ch_refresh_token", data.refresh_token);
        set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token });
        return data.user;
      },
      signup: async (name, email, password, workspace_name) => {
        const { data } = await api.post("/auth/signup", { name, email, password, workspace_name });
        localStorage.setItem("ch_access_token", data.access_token);
        localStorage.setItem("ch_refresh_token", data.refresh_token);
        set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token });
        return data.user;
      },
      logout: () => {
        localStorage.removeItem("ch_access_token");
        localStorage.removeItem("ch_refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
      },
      refreshMe: async () => {
        const { data } = await api.get("/auth/me");
        set({ user: data });
        return data;
      },
      updateUserPassword: async (current, next) => {
        await api.put("/auth/change-password", { current_password: current, new_password: next });
        const u = get().user;
        set({ user: { ...u, must_change_password: false } });
      },
      hydrate: () => set({ hydrated: true }),
    }),
    { name: "ch-auth-v1" }
  )
);

export const usePlatform = create(
  persist(
    (set) => ({
      platform: "instagram",
      dateRange: "7d",
      setPlatform: (platform) => set({ platform }),
      setDateRange: (dateRange) => set({ dateRange }),
    }),
    { name: "ch-platform-v1" }
  )
);

export const useUI = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "dark",
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "ch-ui-v1" }
  )
);
