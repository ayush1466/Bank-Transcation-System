import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "ledger-theme";
const ThemeContext = createContext(null);

// Light is the deliberate default: banking UIs read as more trustworthy on a
// light surface, so we don't follow the OS preference here. Dark stays
// available through the toggle and is remembered once chosen.
const DEFAULT_THEME = "light";

// Reads the stored preference, falling back to the default. The same logic
// runs as an inline script in index.html so the first paint already has the
// right class and there is no flash.
function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode / storage disabled — fall through to the default */
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);

  // Keep <html> in sync: the `dark` class drives every token in index.css.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore — the class is applied either way */
    }
  }, [theme]);

  // Colour changes are jarring when they snap, so enable a short global
  // transition around the flip and drop it again right after.
  const setTheme = useCallback((next) => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 420);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === "dark" }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
