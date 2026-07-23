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

  const login = useCallback(
    async (email, password) => {
      const res = await api.login({ email, password });
      persist(res.user);
      return res.user;
    },
    [persist],
  );

  const register = useCallback(
    async (name, email, password) => {
      const res = await api.register({ name, email, password });
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
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
