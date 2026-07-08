export const APP_NAME = "Praktik AI";
export const APP_DESCRIPTION = "AI-powered learning platform";

export const API_BASE_URL = "/api/backend";

export function backendUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalized}`;
  if (process.env.NODE_ENV !== "production" && url.includes("/api/api/")) {
    console.warn(`[backendUrl] Suspicious /api/api/ duplicate in URL: ${url}`);
  }
  return url;
}

export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  COURSES: "/courses",
  MODULES: "/modules",
  PROFILE: "/profil",
  PUBLIC_DATABASE: "/verejna-databaze",
  CHANGELOG: "/changelog",
  AUTH_CALLBACK: "/auth/callback",
} as const;

// Raw markdown changelogu z projektové wiki na GitHubu.
export const CHANGELOG_URL =
  "https://raw.githubusercontent.com/wiki/markuss23/praktik-ai/Changelog.md";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"];

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;
