/**
 * Tiny API client for talking to the backend.
 *
 * The base URL comes from VITE_API_URL (see .env). During local development
 * the Vite dev server also proxies "/api" to the backend (see vite.config.js),
 * so the default empty base works out of the box.
 */
const BASE_URL = import.meta.env.VITE_API_URL || "";

const TOKEN_KEY = "pki_auth_token";
const OFFICER_KEY = "pki_auth_officer";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredOfficer() {
  const raw = localStorage.getItem(OFFICER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(OFFICER_KEY);
}

export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed");
  }

  const { token, officer } = await res.json();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(OFFICER_KEY, JSON.stringify(officer));
  return officer;
}

async function authedGet(pathname) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (res.status === 401) {
    clearAuth();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function authedRequest(method, pathname, body) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401) {
    clearAuth();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function authedPost(pathname, body) {
  return authedRequest("POST", pathname, body);
}

export function fetchEmployees() {
  return authedGet("/api/employees");
}

export function fetchRaOfficers() {
  return authedGet("/api/ra-officers");
}

/** List signed acknowledgment letters, optionally filtered by employee ID. */
export function fetchLetters(empId) {
  const qs = empId ? `?empId=${encodeURIComponent(empId)}` : "";
  return authedGet(`/api/letters${qs}`);
}

/**
 * Fetch a saved letter PDF (with auth) and open it in a new browser tab.
 * Returns the object URL so the caller can revoke it later if needed.
 */
export async function openLetterFile(fileName) {
  const res = await fetch(
    `${BASE_URL}/api/letters/file?name=${encodeURIComponent(fileName)}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

  if (res.status === 401) {
    clearAuth();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Could not open file: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  return url;
}

/** Change the logged-in user's own password. */
export function changePassword(currentPassword, newPassword) {
  return authedPost("/api/change-password", { currentPassword, newPassword });
}

/** Admin: list all app users. */
export function fetchUsers() {
  return authedGet("/api/admin/users");
}

/** Admin: reset another user's password. */
export function adminResetPassword(username, newPassword) {
  return authedPost("/api/admin/users/reset-password", {
    username,
    newPassword,
  });
}

/** Admin: assign (create) a new RA officer with the default password. */
export function adminAddOfficer(username, label) {
  return authedPost("/api/admin/users", { username, label });
}

/** Admin: remove a user's access. */
export function adminRemoveUser(username) {
  return authedRequest("DELETE", "/api/admin/users", { username });
}

/**
 * Send a PDF (as a base64 string) to the backend so it can be saved
 * directly to the configured OneDrive-synced folder on the server machine.
 */
export async function savePdfToServer(pdfBase64, fileName) {
  const res = await fetch(`${BASE_URL}/api/save-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ pdfBase64, fileName }),
  });

  if (res.status === 401) {
    clearAuth();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Save failed: ${res.status}`);
  }
  return res.json();
}

