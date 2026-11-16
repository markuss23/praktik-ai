// Tikety podpory (backend modul tickets) přes generovaný TicketsApi.
// Chyby převádíme na Error s českým `detail` z backendu, UI ho rovnou zobrazí.

import type { TicketCreate, TicketMessageItem } from "@/api";
import {
  getCourses,
  getMe,
  getMyEnrollments,
  ticketsApi,
  type MyEnrollmentExtended,
} from "@/lib/api-client";
import { readApiErrorDetail } from "@/lib/api-error";
import {
  isTicketUnassigned,
  type Ticket,
  type TicketCategory,
  type TicketEntityType,
  type TicketStatus,
} from "./types";

async function call<T>(request: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await request();
  } catch (err) {
    throw new Error((await readApiErrorDetail(err)) ?? fallback);
  }
}

// Název kurzu backend v tiketu nevrací, doplníme ho (best-effort): student
// z enrollmentů, staff ze seznamu kurzů (v kurzech, které řeší, zapsaný není).
async function loadCourseTitles(staff = false): Promise<Map<number, string>> {
  if (staff) {
    const courses = await getCourses({ includeInactive: true }).catch(() => []);
    return new Map(courses.map((c) => [c.courseId, c.title]));
  }
  const enrollments: MyEnrollmentExtended[] = await getMyEnrollments().catch(() => []);
  return new Map(enrollments.map((e) => [e.courseId, e.course.title]));
}

function withCourseTitle(ticket: Ticket, titles: Map<number, string>): Ticket {
  return ticket.courseId != null
    ? { ...ticket, courseTitle: titles.get(ticket.courseId) }
    : ticket;
}

// Tikety, které uživatel sám založil, od nejnovějšího.
// GET /tickets vrací lektorovi i tikety jeho kurzů a garantovi/superadminovi všechny,
// "Moje tikety" proto filtrujeme na requester.
export async function listMyTickets(): Promise<Ticket[]> {
  const [tickets, me, titles] = await Promise.all([
    call(() => ticketsApi.listTickets(), "Tikety se nepodařilo načíst."),
    getMe(),
    loadCourseTitles(),
  ]);
  return tickets
    .filter((t) => t.requesterId === me.userId)
    .map((t) => withCourseTitle(t, titles));
}

// Tikety k vyřízení pro staff (administrace): lektor dostane tikety svých kurzů,
// garant a superadmin všechny. Vlastní dotazy patří do Moje tikety, tady ne.
export async function listStaffTickets(): Promise<Ticket[]> {
  const [tickets, me, titles] = await Promise.all([
    call(() => ticketsApi.listTickets(), "Tikety se nepodařilo načíst."),
    getMe(),
    loadCourseTitles(true),
  ]);
  return tickets
    .filter((t) => t.requesterId !== me.userId)
    .map((t) => withCourseTitle(t, titles));
}

// Počet tiketů k vyřízení, které nikdo neřeší (záložka Nové) pro odznak v menu administrace.
export async function countNewStaffTickets(userId: number): Promise<number> {
  const tickets = await call(() => ticketsApi.listTickets(), "Tikety se nepodařilo načíst.");
  return tickets.filter((t) => isTicketUnassigned(t) && t.requesterId !== userId).length;
}

// Tiket v administraci se změnil (převzetí, uzavření, smazání), menu si obnoví počet.
export const STAFF_TICKETS_CHANGED_EVENT = "tickets:staff-changed";

export function dispatchStaffTicketsChanged(): void {
  window.dispatchEvent(new Event(STAFF_TICKETS_CHANGED_EVENT));
}

export async function getTicket(ticketId: number, options: { staff?: boolean } = {}): Promise<Ticket> {
  const [ticket, titles] = await Promise.all([
    call(() => ticketsApi.getTicket({ ticketId }), "Tiket se nepodařilo načíst."),
    loadCourseTitles(options.staff),
  ]);
  return withCourseTitle(ticket, titles);
}

// Staff si převezme tiket ve stavu open -> in_progress, assignee = on.
export function claimTicket(ticketId: number): Promise<Ticket> {
  return call(() => ticketsApi.claimTicket({ ticketId }), "Tiket se nepodařilo převzít.");
}

// Ručně jde jen resolved (jen staff) a closed (z resolved, zakladatel i staff); práva vynucuje backend.
export function updateTicketStatus(
  ticketId: number,
  status: Extract<TicketStatus, "resolved" | "closed">,
): Promise<Ticket> {
  return call(
    () => ticketsApi.updateTicketStatus({ ticketId, ticketStatusUpdate: { status } }),
    "Stav tiketu se nepodařilo změnit.",
  );
}

// Vlákno zpráv od nejstarší; interní poznámky staffu backend zakladateli nepošle.
export function listTicketMessages(ticketId: number): Promise<TicketMessageItem[]> {
  return call(
    () => ticketsApi.listTicketMessages({ ticketId }),
    "Konverzaci se nepodařilo načíst.",
  );
}

// Odpověď do vlákna; u vyřešeného tiketu ho backend vrátí do in_progress.
// Interní poznámku smí jen staff a zakladatel ji nevidí.
export function addTicketMessage(
  ticketId: number,
  body: string,
  isInternal = false,
): Promise<TicketMessageItem> {
  return call(
    () => ticketsApi.addTicketMessage({ ticketId, ticketMessageCreate: { body, isInternal } }),
    "Zprávu se nepodařilo odeslat.",
  );
}

// Povolené kategorie pro každý typ entity (GET /tickets/categories, veřejný endpoint).
export async function getTicketCategories(): Promise<
  Partial<Record<TicketEntityType, TicketCategory[]>>
> {
  const all = await call(
    () => ticketsApi.getTicketCategories(),
    "Typy dotazů se nepodařilo načíst.",
  );
  return Object.fromEntries(all.map((c) => [c.entityType, c.allowedCategories]));
}

// První zpráva vlákna se posílá rovnou s tiketem (`message`).
export function createTicket(data: TicketCreate): Promise<Ticket> {
  return call(
    () => ticketsApi.createTicket({ ticketCreate: data }),
    "Dotaz se nepodařilo odeslat.",
  );
}

// Zakladatel smí smazat jen tiket ve stavu open (staff kdykoli).
export async function deleteTicket(ticketId: number): Promise<void> {
  await call(() => ticketsApi.deleteTicket({ ticketId }), "Tiket se nepodařilo smazat.");
}
