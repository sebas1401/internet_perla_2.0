import axios from "axios";
// Resolve API base dynamically
// Priority:
// 1) VITE_API_URL (absolute, e.g. https://api.example.com/api/v1)
// 2) VITE_API_BASE_URL (can be relative, e.g. /api/v1 for Vite proxy)
// 3) Fallback to host:3000/api/v1 (works for Docker/dev when backend on 3000)
const apiUrl = (import.meta.env.VITE_API_URL as string) || undefined;
const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || undefined;
const isViteDev =
  typeof window !== "undefined" &&
  window.location &&
  window.location.port === "5173";
// Prefer proxy in Vite dev if no env is provided
const devProxyBase = "/api/v1";
const fallbackBase = `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;
const baseURL = apiUrl || apiBase || (isViteDev ? devProxyBase : fallbackBase);
const api = axios.create({ baseURL });

export function setAuth(token?: string) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

export function getApiOrigin() {
  try {
    return new URL(baseURL).origin;
  } catch {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
}

export default api;
