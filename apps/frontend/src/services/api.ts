import axios from 'axios';
// Resolve API base dynamically to support access from otros dispositivos en la red
const fallbackBase = `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || fallbackBase });
export function setAuth(token?: string){ if(token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`; else delete api.defaults.headers.common['Authorization']; }
export default api;
