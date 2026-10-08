// Předání dotazu z AI chatu na stránku tiketů přes přihlášení.
//
// Nepřihlášený uživatel, který chce z chatu založit tiket, musí projít
// Keycloakem (přihlášení nebo registrace). Dotaz si proto odložíme do
// sessionStorage, po návratu ho /moje-tikety vyzvedne a předvyplní jím
// „Nový dotaz". sessionStorage přežije přesměrování v rámci tabu a nikam
// dál se nedostane.

import { ROUTES } from "@/lib/constants";
import type { Ticket } from "./types";

const DRAFT_STORAGE_KEY = "praktik-ai:ticket-draft";

/** Query parametr, kterým /moje-tikety pozná, že má otevřít „Nový dotaz". */
export const NEW_TICKET_QUERY_PARAM = "novy-dotaz";

/** Kam se po přihlášení vrátit, aby se rovnou otevřelo založení tiketu. */
export const NEW_TICKET_RETURN_PATH = `${ROUTES.MY_TICKETS}?${NEW_TICKET_QUERY_PARAM}=1`;

/**
 * Událost po založení tiketu odjinud než ze stránky se seznamem (AI chat
 * ve widgetu) — seznamy tiketů se podle ní obnoví. `detail` = nový tiket.
 */
export const TICKET_CREATED_EVENT = "tickets:created";

export interface TicketDraft {
  title: string;
  reason: string;
}

export function saveTicketDraft(draft: TicketDraft): void {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // bez úložiště se jen nepředvyplní formulář, tiket jde založit i tak
  }
}

/** Vrátí odložený dotaz a smaže ho, aby se nepředvyplňoval opakovaně. */
export function takeTicketDraft(): TicketDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<TicketDraft>) : null;
    if (parsed && typeof parsed.title === "string" && typeof parsed.reason === "string") {
      return { title: parsed.title, reason: parsed.reason };
    }
  } catch {
    // poškozený nebo nedostupný záznam — formulář zůstane prázdný
  }
  return null;
}

export function dispatchTicketCreated(ticket: Ticket): void {
  window.dispatchEvent(new CustomEvent<Ticket>(TICKET_CREATED_EVENT, { detail: ticket }));
}
