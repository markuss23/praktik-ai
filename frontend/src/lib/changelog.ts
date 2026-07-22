import { CHANGELOG_URL } from "./constants";

// Stáhne raw markdown changelogu z projektové wiki na GitHubu.
// Cache na 1 hodinu — stačí pravidelná aktualizace, není potřeba síťový
// request při každém zobrazení.
export async function fetchChangelog(): Promise<string | null> {
  try {
    const res = await fetch(CHANGELOG_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
