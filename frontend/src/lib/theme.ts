// Světlý / tmavý režim. Tmavý režim = třída `.dark` na <html> (tokeny v
// globals.css pod `.dark`, Tailwind varianta `dark:`). Volba se pamatuje
// v localStorage per prohlížeč.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "praktik-ai-theme";

/**
 * Inline skript do <head> root layoutu — nastaví `.dark` ještě před prvním
 * vykreslením, aby po obnovení stránky neprobliklo světlé UI. Musí být
 * samostatný řetězec bez importů (běží mimo React bundle).
 */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // privátní okno — režim platí jen do obnovení stránky
  }
}
