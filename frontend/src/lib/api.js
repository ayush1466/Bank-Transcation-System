// Central place that talks to the Express backend.
// Every call sends `credentials: "include"` so the httpOnly auth cookie
// set by /api/auth/login flows on every subsequent request.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON, but don't blow up on empty responses.
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // ---- auth ----
  register: (payload) =>
    request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST" }),

  // ---- accounts ----
  createAccount: () => request("/accounts/", { method: "POST" }),
  getMyAccounts: () => request("/accounts/"),
  getAllAccounts: () => request("/accounts/all"),
  getBalance: (accountId) => request(`/accounts/balance/${accountId}`),

  // ---- transactions ----
  transfer: (payload) =>
    request("/transactions/", { method: "POST", body: payload }),
  seedInitialFunds: (payload) =>
    request("/transactions/system/initial-funds", {
      method: "POST",
      body: payload,
    }),
};
