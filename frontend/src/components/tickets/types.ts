// Doménové typy pro tikety podpory (backend: module_tickets).

export type TicketStatus = "open" | "resolved";

export type TicketType = "task_session" | "practice" | "other";

export interface Ticket {
  ticketId: number;
  userId: number;
  moduleId: number;
  courseId: number;
  ticketType: TicketType;
  title: string;
  /** Původní dotaz uživatele (první zpráva konverzace). */
  reason: string;
  /** Odpověď podpory (autor kurzu / garant); null dokud tiket nikdo nevyřešil. */
  reply: string | null;
  status: TicketStatus;
  createdAt: Date;
  /** Název kurzu — doplněný z enrollmentů, backend ho v tiketu nevrací. */
  courseTitle?: string;
}

/** Jedna bublina konverzace k tiketu. */
export interface TicketMessage {
  id: string;
  author: "user" | "support" | "ai";
  text: string;
  timestamp?: Date;
  authorName?: string;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aktivní",
  resolved: "Vyřešeno",
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  task_session: "Ověření konceptu",
  practice: "Procvičování",
  other: "Jiné",
};

/** Formát čísla tiketu podle mockupů: #PA-00123. */
export function formatTicketCode(ticketId: number): string {
  return `#PA-${String(ticketId).padStart(5, "0")}`;
}

/** Formát data podle mockupů: „17:35 28. 6. 2026". */
export function formatTicketDateTime(date: Date): string {
  const time = date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} ${date.toLocaleDateString("cs-CZ")}`;
}

/** Krátký formát pro bubliny konverzace: „28. 6. 9:31". */
export function formatMessageTime(date: Date): string {
  const day = date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  const time = date.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

/**
 * Sestaví konverzaci z tiketu. Backend zatím drží jen dvojici
 * dotaz (reason) + odpověď podpory (reply); až přibude tabulka zpráv,
 * stačí rozšířit tuto funkci — UI komponenty už s polem zpráv počítají.
 */
export function buildTicketConversation(ticket: Ticket): TicketMessage[] {
  const messages: TicketMessage[] = [
    {
      id: `${ticket.ticketId}-reason`,
      author: "user",
      text: ticket.reason,
      timestamp: ticket.createdAt,
    },
  ];

  if (ticket.reply) {
    messages.push({
      id: `${ticket.ticketId}-reply`,
      author: "support",
      text: ticket.reply,
      authorName: "Podpora",
    });
  }

  return messages;
}
