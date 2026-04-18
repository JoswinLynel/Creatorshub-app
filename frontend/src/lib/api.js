import axios from "axios";
import toast from "react-hot-toast";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

// --- token helpers ---------------------------------------------------------
const ACCESS_KEY = "ch_access_token";
const REFRESH_KEY = "ch_refresh_token";
const ZUSTAND_AUTH_KEY = "ch-auth-v1";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

// Hard-clear every auth artefact (tokens + persisted zustand user).
// This is called from the interceptor when refresh fails, so we don't
// end up with a lingering `user` in zustand -> RedirectIfAuthed loop.
export const clearAuth = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ZUSTAND_AUTH_KEY);
};

// --- request interceptor: inject access token -----------------------------
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- response interceptor: refresh-token flow with request queueing -------
let isRefreshing = false;
let queue = []; // { resolve, reject, config }

const flushQueue = (err, token) => {
  queue.forEach(({ resolve, reject, config }) => {
    if (err) return reject(err);
    config.headers.Authorization = `Bearer ${token}`;
    resolve(api(config));
  });
  queue = [];
};

const hardLogout = (reason) => {
  clearAuth();
  const path = window.location.pathname;
  if (path !== "/login" && path !== "/signup") {
    // full reload so zustand re-hydrates from the now-empty storage
    window.location.replace("/login");
  }
  return Promise.reject(reason);
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = (original.url || "").toString();

    // Never try to refresh the refresh call itself, or the login/signup calls
    const isAuthCall =
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/signup");

    if (status !== 401 || original._retry || isAuthCall) {
      return Promise.reject(error);
    }

    const refresh = getRefreshToken();
    if (!refresh) {
      return hardLogout(error);
    }

    if (isRefreshing) {
      // queue this request until the ongoing refresh resolves
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: original });
      });
    }

    original._retry = true;
    isRefreshing = true;
    try {
      const { data } = await axios.post(`${API}/auth/refresh`, {
        refresh_token: refresh,
      });
      setTokens(data.access_token, null);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      flushQueue(null, data.access_token);
      return api(original);
    } catch (e) {
      flushQueue(e, null);
      return hardLogout(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export const handleApiError = (e, fallback = "Something went wrong") => {
  const msg = e?.response?.data?.detail || fallback;
  toast.error(msg);
  return msg;
};
