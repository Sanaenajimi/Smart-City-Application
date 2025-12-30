// frontend/src/lib/api.js
// Smart City - API helper (Render-friendly)
//
// Priority order for API base URL:
// 1) VITE_API_BASE_URL (preferred; injected at Vite build time)
// 2) window.__SMARTCITY_API_BASE_URL (optional runtime override)
// 3) Hard fallback to known Render backend URL (production safety)

const BUILD_BASE = (import.meta?.env?.VITE_API_BASE_URL || "").trim();

// Optional runtime override (you can set it in index.html if needed)
// window.__SMARTCITY_API_BASE_URL = "https://smart-city-3-73pj.onrender.com";
const RUNTIME_BASE =
  (typeof window !== "undefined" && window.__SMARTCITY_API_BASE_URL) ? String(window.__SMARTCITY_API_BASE_URL).trim() : "";

// Hard fallback (your backend Render URL)
const FALLBACK_BASE = "https://smart-city-back-sanae.onrender.com";

// Normalize (remove trailing slashes)
function normalize(url) {
  return (url || "").replace(/\/+$/, "");
}

const API_BASE = normalize(BUILD_BASE) || normalize(RUNTIME_BASE) || normalize(FALLBACK_BASE);

// Debug logs (keep while validating, remove after)
console.log("[SmartCity] VITE_API_BASE_URL (build) =", BUILD_BASE);
console.log("[SmartCity] __SMARTCITY_API_BASE_URL (runtime) =", RUNTIME_BASE);
console.log("[SmartCity] API_BASE (effective) =", API_BASE);

function buildUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

function getToken() {
  try {
    return localStorage.getItem("sc_token") || localStorage.getItem("jwt") || "";
  } catch {
    return "";
  }
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function request(path, options = {}) {
  const url = buildUrl(path);

  const token = getToken();
  const headers = { ...(options.headers || {}) };

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (
    !isFormData &&
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof Blob)
  ) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchOptions = { ...options, headers };

  if (
    fetchOptions.body &&
    typeof fetchOptions.body === "object" &&
    !isFormData &&
    !(fetchOptions.body instanceof Blob) &&
    (headers["Content-Type"] || "").includes("application/json")
  ) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch {
    throw new Error(`Failed to fetch (${url}). Vérifie que le backend est en ligne.`);
  }

  if (!res.ok) {
    const payload = await parseJsonSafe(res);
    const msg =
      payload?.error ||
      payload?.message ||
      `HTTP ${res.status} ${res.statusText} sur ${path}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await res.json();
  return await res.text();
}

export async function apiGet(path) {
  return request(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return request(path, { method: "POST", body });
}

export async function apiPut(path, body) {
  return request(path, { method: "PUT", body });
}

export async function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export async function apiDownload(path, filename = "rapport.pdf") {
  const url = buildUrl(path);

  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method: "GET", headers });
  } catch {
    throw new Error(`Failed to fetch (${url}). Vérifie que le backend est en ligne.`);
  }

  if (!res.ok) {
    const payload = await parseJsonSafe(res);
    const msg = payload?.error || payload?.message || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export const API_BASE_URL = API_BASE;
