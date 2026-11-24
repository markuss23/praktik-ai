// Barevny rezim aplikace, trida .dark na <html>. Volba se pamatuje pro kazdeho prihlaseneho
// uzivatele zvlast (localStorage, klic podle sub z access tokenu); bez prihlaseni je svetly rezim.

import { ACCESS_TOKEN_STORAGE_KEY } from "@/lib/keycloak";

export type Theme = "light" | "dark";

export const DEFAULT_THEME: Theme = "light";
export const THEME_KEY_PREFIX = "praktik-ai-theme:";

export function userThemeKey(userId: string) {
  return THEME_KEY_PREFIX + userId;
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

// Inline script v <head> nastavi tridu jeste pred prvnim vykreslenim, jinak by tmavy rezim
// po nacteni probliknul svetlym. Sub cte z payloadu JWT stejne jako parseJwt v lib/keycloak.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  ACCESS_TOKEN_STORAGE_KEY,
)});if(!t)return;var p=JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));if(localStorage.getItem(${JSON.stringify(
  THEME_KEY_PREFIX,
)}+p.sub)==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})()`;
