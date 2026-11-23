"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { ACCESS_TOKEN_STORAGE_KEY, getStoredTokens, parseJwt } from "@/lib/keycloak";
import { DEFAULT_THEME, THEME_KEY_PREFIX, isTheme, userThemeKey, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CHANGE_EVENT = "praktik:theme-change";

// Bez prihlaseni se volba nikam neuklada (napr. prepinac na /ui-kit), plati do reloadu
let anonymousTheme: Theme = DEFAULT_THEME;

function currentUserId(): string | null {
  try {
    const tokens = getStoredTokens();
    return tokens ? (parseJwt(tokens.accessToken)?.sub ?? null) : null;
  } catch {
    return null;
  }
}

function readTheme(): Theme {
  const userId = currentUserId();
  if (!userId) return anonymousTheme;
  try {
    const stored = localStorage.getItem(userThemeKey(userId));
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// Pri prepnuti docasne vypne transition, jinak se barvy prelevaji kazda jinou rychlosti
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === "dark";
  if (root.classList.contains("dark") === isDark) return;

  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  root.classList.toggle("dark", isDark);
  // Vynuceny reflow, aby se nove barvy propsaly jeste bez transition
  void window.getComputedStyle(document.body).opacity;
  window.setTimeout(() => style.remove(), 1);
}

// Prihlaseni, odhlaseni nebo volba z jine zalozky -> prebarvit i tuhle stranku
function subscribe(onChange: () => void) {
  const sync = () => {
    applyTheme(readTheme());
    onChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === ACCESS_TOKEN_STORAGE_KEY ||
      event.key.startsWith(THEME_KEY_PREFIX)
    ) {
      sync();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("kc:login", sync);
  window.addEventListener("kc:logout", sync);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("kc:login", sync);
    window.removeEventListener("kc:logout", sync);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// Server nezna localStorage; skutecnou tridu na <html> uz nastavil THEME_INIT_SCRIPT
function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  // Pojistka, kdyby init script nedobehl (napr. jiny tvar tokenu)
  useEffect(() => {
    applyTheme(readTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const userId = currentUserId();
    if (userId) {
      try {
        localStorage.setItem(userThemeKey(userId), next);
      } catch {
        // storage nedostupny, volba plati jen do reloadu
      }
    } else {
      anonymousTheme = next;
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme musi byt uvnitr ThemeProvider");
  return context;
}
