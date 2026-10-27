import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Truncate text to a specific length
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Czech pluralization: pick the right form for 1 / few (2-4) / many (0, 5+).
 * Example: czechPlural(n, 'modul', 'moduly', 'modulů')
 */
export function czechPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

/**
 * Relativní čas v češtině („Právě teď", „Před 5m", „Před 2 dny").
 * Sdíleno mezi review pohledy — dřív existovaly dvě totožné lokální kopie.
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Právě teď';
  if (diffMin < 60) return `Před ${diffMin}m`;
  if (diffHours < 24) return `Před ${diffHours}h`;
  if (diffDays === 1) return 'Před 1 dnem';
  return `Před ${diffDays} dny`;
}

/**
 * Reset geometrie kitového `Button`u na chování původního `<button>`.
 *
 * Kit má pevné `size-*`/`h-*` a vynucuje 16px ikony. Tam, kde si komponenta
 * drží vlastní rozměry (padding + `size={n}` na ikoně), to přepíšeme, aby
 * migrace na kit nezměnila rozměr:
 *   `<Button size="icon" className={cn(BTN_KEEP_BOX, "p-2")}>`
 *
 * 1px průhledný border kitu schválně necháváme — je neviditelný a nese
 * `focus-visible:border-ring`.
 */
export const BTN_KEEP_BOX =
  "size-auto [&_svg:not([class*='size-'])]:size-auto";
