import axios from "axios";

const isLocal = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);

const API_CANDIDATES = [
  import.meta.env.VITE_API_URL,
  isLocal ? "http://127.0.0.1:8000" : "https://momentum-ai-api.vercel.app",
  isLocal ? "http://127.0.0.1:8080" : null,
  isLocal ? "https://momentum-ai-api.vercel.app" : "http://127.0.0.1:8000",
].filter(Boolean);

let savedBase = localStorage.getItem("momentum_api_base");
if (savedBase && !API_CANDIDATES.includes(savedBase)) {
  savedBase = null;
  localStorage.removeItem("momentum_api_base");
}

let activeBase = savedBase || API_CANDIDATES[0];

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
