// web/src/utils/apiBase.js
import axios from '/api/axios';

// Single source of truth for the backend origin.
// axios.defaults.baseURL is ".../api"; strip that suffix to get the origin.
export const API_ORIGIN =
  (axios.defaults.baseURL || '').replace(/\/api\/?$/, '') ||
  'https://thisnorth-production-backend.up.railway.app';

// Turn a possibly-relative image path from the API into a full URL.
export function getFullImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}