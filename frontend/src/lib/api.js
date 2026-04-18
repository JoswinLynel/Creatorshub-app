import axios from "axios";
import toast from "react-hot-toast";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ch_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const refresh = localStorage.getItem("ch_refresh_token");
      if (!refresh || refreshing) {
        localStorage.removeItem("ch_access_token");
        localStorage.removeItem("ch_refresh_token");
        if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post(`${API}/auth/refresh`, { refresh_token: refresh });
        localStorage.setItem("ch_access_token", data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        refreshing = false;
        return api(original);
      } catch (e) {
        refreshing = false;
        localStorage.removeItem("ch_access_token");
        localStorage.removeItem("ch_refresh_token");
        window.location.href = "/login";
        return Promise.reject(e);
      }
    }
    if (error.response?.data?.detail) {
      // optional global error; components usually handle their own
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (e, fallback = "Something went wrong") => {
  const msg = e?.response?.data?.detail || fallback;
  toast.error(msg);
  return msg;
};
