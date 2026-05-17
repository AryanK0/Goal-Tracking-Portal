import axios from "axios";

const API_CANDIDATES = [
  import.meta.env.VITE_API_URL,
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8080"
].filter(Boolean);

let activeBase = localStorage.getItem("momentum_api_base") || API_CANDIDATES[0];

export const api = axios.create({ baseURL: activeBase, timeout: 12000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("momentum_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  if (error.config?._retried) throw error;
  for (const base of API_CANDIDATES) {
    if (base === activeBase) continue;
    try {
      activeBase = base;
      localStorage.setItem("momentum_api_base", base);
      api.defaults.baseURL = base;
      const retry = { ...error.config, baseURL: base, _retried: true };
      return await axios(retry);
    } catch {
      // Try next local API port.
    }
  }
  throw error;
});

export function apiBase() {
  return activeBase;
}

export function messageFromError(error) {
  return error?.response?.data?.detail || error?.message || "Something went wrong";
}
