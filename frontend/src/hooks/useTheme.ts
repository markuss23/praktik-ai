"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyTheme, getTheme, type Theme } from "@/lib/theme";

// Zdroj pravdy je třída `.dark` na <html>. Hlídáme ji MutationObserverem,
// takže všechny přepínače (profil, /ui-kit) zůstávají v synchronu.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/** Aktuální režim a jeho přepnutí (uloží se do localStorage). */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, getTheme, () => "light");

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggleTheme = useCallback(
    () => applyTheme(getTheme() === "dark" ? "light" : "dark"),
    [],
  );

  return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}
