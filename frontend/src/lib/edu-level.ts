/**
 * Lokalizované popisky úrovně vzdělání (EduLevel enum z backendu) pro UI selecty.
 * Hodnota = enum string posílaný backendu (`educationLevel` filtr), label = český text.
 * Žije mimo generovaný `src/api`, aby ho regenerace klienta nezahodila.
 */
export const EDU_LEVEL_LABELS: Record<string, string> = {
  primary: "Základní škola",
  secondary: "Střední škola",
  higher: "Vysoká škola",
};

/** Pořadí pro select — od nejnižší po nejvyšší úroveň. */
export const EDU_LEVEL_ORDER = ["primary", "secondary", "higher"] as const;
