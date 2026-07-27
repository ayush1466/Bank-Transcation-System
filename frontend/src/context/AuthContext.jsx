import { createContext, useContext, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "ledger.user";

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const persist = useCallback((u) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Merge a partial update into the current user (e.g. hasTransferPassword)
  // without clobbering the rest of the stored profile.
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await api.login({ email, password });
      persist(res.user);
      return res.user;
    },
    [persist],
  );

  // Step 1: send the verification code. Does not create the user yet.
  const registerRequest = useCallback(
    (name, email, password) =>
      api.requestRegisterOtp({ name, email, password }),
    [],
  );

  // Step 2: verify the code, which creates the user and signs them in.
  const registerVerify = useCallback(
    async (email, code) => {
      const res = await api.verifyRegisterOtp({ email, code });
      persist(res.user);
      return res.user;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      persist(null);
    }
  }, [persist]);

  return (
    <AuthContext.Provider
      value={{ user, login, registerRequest, registerVerify, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
