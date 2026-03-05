export const APP_NAME = "Praktik AI";
export const APP_DESCRIPTION = "AI-powered learning platform";

export const API_BASE_URL = "/api/backend";

export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  COURSES: "/courses",
  MODULES: "/modules",
  PROFILE: "/profil",
  AUTH_CALLBACK: "/auth/callback",
} as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"];

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;
