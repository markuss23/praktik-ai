// Doménové typy pro tikety podpory (backend: tickets).

import type {
  TicketEntityType,
  TicketItem,
  TicketMessageItem,
  TicketStatus,
  TicketType as TicketCategory,
} from "@/api";
import { splitDiagnostics } from "./diagnostics";

export type { TicketCategory, TicketEntityType, TicketStatus };

// Tiket z backendu + název kurzu doplněný z enrollmentů (backend ho nevrací).
export type Ticket = TicketItem & { courseTitle?: string };

// Jedna bublina konverzace k tiketu.
export interface TicketMessage {
  id: string;
  author: "user" | "support" | "ai";
  text: string;
  timestamp?: Date;
  authorName?: string;
  // Technické informace přiložené ke zprávě (prohlížeč, rozlišení apod.).
  details?: string[];
  // Interní poznámka staffu, zakladatel tiketu ji nevidí.
  internal?: boolean;
}

// Popisky podle stavových pilulek z Figmy (kitový Badge).
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Nové",
  in_progress: "V řešení",
  pending: "Čeká na uživatele",
  resolved: "Vyřešené",
  closed: "Uzavřené",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  task_session: "Ověření konceptu",
  practice: "Procvičování",
  course_feedback: "Zpětná vazba ke kurzu",
  content_issue: "Chyba v materiálu",
  bug: "Chyba v aplikaci",
  question: "Dotaz",
  other: "Jiné",
};

// Čeho se tiket týká (entity_type).
export const TICKET_ENTITY_LABELS: Record<TicketEntityType, string> = {
  module: "Modul kurzu",
  course: "Kurz jako celek",
  pub_resource: "Veřejný materiál",
  general: "Obecný dotaz",
};

// Stejné jako UNRESOLVED_STATUSES na backendu.
const UNRESOLVED_STATUSES: readonly TicketStatus[] = ["open", "in_progress", "pending"];

export function isTicketUnresolved(ticket: Pick<Ticket, "status">): boolean {
  return UNRESOLVED_STATUSES.includes(ticket.status);
}

// Formát čísla tiketu podle mockupů: #PA-00123.
export function formatTicketCode(ticketId: number): string {
  return `#PA-${String(ticketId).padStart(5, "0")}`;
}

// Zakladatel smí tiket smazat jen ve stavu open (delete_ticket), i když do něj už staff napsal.
export function isTicketDeletable(ticket: Ticket): boolean {
  return ticket.status === "open";
}

// Nevyřešený tiket, který nikdo neřeší: nový, nebo znovu otevřený po vyřešení bez převzetí
// (claim backend dovolí jen z open, takže ten druhý už převzít nejde).
export function isTicketUnassigned(ticket: Pick<Ticket, "status" | "assigneeId">): boolean {
  return isTicketUnresolved(ticket) && ticket.assigneeId == null;
}

// Formát data podle mockupů: "17:35 28. 6. 2026".
export function formatTicketDateTime(date: Date): string {
  const time = date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} ${date.toLocaleDateString("cs-CZ")}`;
}

// Krátký formát pro bubliny konverzace: "28. 6. 9:31".
export function formatMessageTime(date: Date): string {
  const day = date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  const time = date.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

// Vlákno z backendu -> bubliny. Zprávy čtenáře jsou "Vy" vpravo, ostatní vlevo
// se jménem. Bez viewerId čte zakladatel tiketu (Moje tikety).
export function buildTicketConversation(
  ticket: Pick<Ticket, "requesterId">,
  messages: TicketMessageItem[],
  viewerId?: number,
): TicketMessage[] {
  const selfId = viewerId ?? ticket.requesterId;
  // Zakladatel interní poznámky nevidí. Backend mu je pošle, pokud je k entitě zároveň staff
  // (např. garant u vlastního obecného tiketu), proto je skrýváme tady.
  const visible = viewerId === undefined ? messages.filter((m) => !m.isInternal) : messages;
  return visible.map((m) => {
    const own = m.authorId === selfId;
    const name = m.authorDisplayName || "Podpora";
    const { text, details } = splitDiagnostics(m.body);
    return {
      id: String(m.messageId),
      author: own ? "user" : "support",
      text,
      details,
      internal: m.isInternal,
      timestamp: m.createdAt,
      authorName: own
        ? undefined
        : m.authorId === ticket.requesterId
          ? `${name} · autor tiketu`
          : name,
    };
  });
}
