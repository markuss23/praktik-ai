//  Tikety podpory (backend modul module_tickets) API functions
//
//  Endpointy zatím nejsou v generovaném klientovi – voláme je přímo
//  přes fetch se stejným tokenem jako generovaný klient (stejný vzor
//  jako resource comments v lib/api-client.ts). Po `npm run
//  generate:openapi` je lze nahradit generovaným ModuleTicketsApi.
//
//  Omezení backendu (stav k dnešku):
//  - GET /module-tickets vyžaduje course_id → „všechny moje tikety"
//    skládáme přes kurzy z enrollmentů.
//  - Odpovědět může jen autor kurzu / garant (a jen jednou); vlastník
//    tiketu komentáře přidávat nemůže a tiket nelze ručně označit jako
//    vyřešený — příslušné UI akce proto zatím hlásí nedostupnost.

import { backendUrl } from "@/lib/constants";
import { getValidAccessToken } from "@/lib/keycloak";
import { getMyEnrollments } from "@/lib/api-client";
import type { Ticket, TicketStatus, TicketType } from "./types";

function mapTicket(json: Record<string, unknown>): Ticket {
  return {
    ticketId: json["ticket_id"] as number,
    userId: json["user_id"] as number,
    moduleId: json["module_id"] as number,
    courseId: json["course_id"] as number,
    ticketType: json["ticket_type"] as TicketType,
    title: json["title"] as string,
    reason: json["reason"] as string,
    reply: (json["reply"] as string | null) ?? null,
    status: json["status"] as TicketStatus,
    createdAt: new Date(json["created_at"] as string),
  };
}

async function ticketsFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  const res = await fetch(backendUrl(path), {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let detail = `Požadavek selhal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // odpověď nemusí být JSON
    }
    throw new Error(detail);
  }
  return res;
}

/** Vrátí tikety jednoho kurzu (student vidí jen své). */
export async function listCourseTickets(courseId: number): Promise<Ticket[]> {
  const res = await ticketsFetch(`/api/v1/module-tickets?course_id=${courseId}`);
  const data = (await res.json()) as Record<string, unknown>[];
  return data.map(mapTicket);
}

/**
 * Vrátí všechny tikety přihlášeného uživatele napříč zapsanými kurzy,
 * seřazené od nejnovějšího. Kurzy, u kterých dotaz selže, přeskočí.
 */
export async function listMyTickets(): Promise<Ticket[]> {
  const enrollments = await getMyEnrollments();
  const results = await Promise.allSettled(
    enrollments.map(async (e): Promise<Ticket[]> => {
      const tickets = await listCourseTickets(e.courseId);
      return tickets.map((t) => ({ ...t, courseTitle: e.course.title }));
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<Ticket[]> => r.status === "fulfilled",
    )
    .flatMap((r) => r.value)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export interface TicketCreatePayload {
  moduleId: number;
  ticketType: TicketType;
  title: string;
  reason: string;
}

/** Vytvoří nový tiket. Student musí být zapsán v kurzu modulu. */
export async function createTicket(data: TicketCreatePayload): Promise<Ticket> {
  const res = await ticketsFetch(`/api/v1/module-tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      module_id: data.moduleId,
      ticket_type: data.ticketType,
      title: data.title,
      reason: data.reason,
    }),
  });
  return mapTicket((await res.json()) as Record<string, unknown>);
}

/** Smaže tiket (student jen dokud nemá odpověď). */
export async function deleteTicket(ticketId: number): Promise<void> {
  await ticketsFetch(`/api/v1/module-tickets/${ticketId}`, { method: "DELETE" });
}

/** Jednotná hláška pro akce, které backend neumí. */
export const TICKET_ACTION_UNSUPPORTED =
  "neni implemnetovat";
