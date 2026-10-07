interface ValidationIssue {
  msg?: string;
  loc?: (string | number)[];
}

/**
 * Přečte `detail` z chybové odpovědi backendu (ResponseError generovaného
 * klienta). U 400 je to česká hláška z controlleru, u 422 pole validačních
 * chyb pydanticu. Když nic čitelného není, vrací null a volající použije
 * vlastní fallback.
 */
export async function readApiErrorDetail(err: unknown): Promise<string | null> {
  const response = (err as { response?: Response } | null)?.response;
  if (!response || typeof response.clone !== 'function') return null;
  try {
    const data = await response.clone().json();
    const detail = data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = (detail as ValidationIssue[])
        .map((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          return field && issue.msg ? `${field}: ${issue.msg}` : issue.msg;
        })
        .filter(Boolean);
      return messages.length > 0 ? messages.join('; ') : null;
    }
  } catch {
    // tělo není JSON
  }
  return null;
}
