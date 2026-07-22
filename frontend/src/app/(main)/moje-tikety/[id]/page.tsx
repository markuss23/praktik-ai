"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import {
  buildTicketConversation,
  formatTicketCode,
  listMyTickets,
  Ticket,
  TICKET_MESSAGING_UNAVAILABLE,
  TicketCard,
  TicketConversation,
  TicketDeleteModal,
  TicketReplyBox,
} from "@/components/tickets";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = Number(params.id);
  const { user, loading: authLoading, login, isAuthenticated } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      login();
    }
  }, [authLoading, user, login]);

  // Backend nemá GET /module-tickets/{id} — tiket dohledáme v seznamu.
  useEffect(() => {
    if (!isAuthenticated || !Number.isFinite(ticketId)) {
      if (!Number.isFinite(ticketId)) setLoading(false);
      return;
    }
    let cancelled = false;
    listMyTickets()
      .then((tickets) => {
        if (!cancelled) {
          setTicket(tickets.find((t) => t.ticketId === ticketId) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setTicket(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ticketId]);

  const messages = useMemo(
    () => (ticket ? buildTicketConversation(ticket) : []),
    [ticket],
  );

  return (
    <div className="py-8">
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: "1440px", width: "100%" }}
      >
        {/* Breadcrumb */}
        <p className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700 transition-colors">
            Home
          </Link>
          {" / "}
          <Link href={ROUTES.MY_TICKETS} className="hover:text-gray-700 transition-colors">
            Moje tikety
          </Link>
          {" / "}
          <span className="text-gray-700">
            {Number.isFinite(ticketId) ? formatTicketCode(ticketId) : "Tiket"}
          </span>
        </p>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 flex items-center justify-center">
            <p className="text-sm text-gray-500">Načítání tiketu…</p>
          </div>
        ) : !ticket ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500">Tiket nenalezen.</p>
            <Link
              href={ROUTES.MY_TICKETS}
              className="inline-block mt-3 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              Zpět na Moje tikety
            </Link>
          </div>
        ) : (
          <>
            {/* Hlavička tiketu */}
            <TicketCard ticket={ticket} hideDetailButton large onDelete={setTicketToDelete} />

            {/* Konverzace */}
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Konverzace</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
              <TicketConversation messages={messages} />
            </div>

            {/* Odpověď — vlastník tiketu zatím přes backend komentovat ani
                uzavírat nemůže, vstupy jsou deaktivované s vysvětlením. */}
            <TicketReplyBox disabledNotice={TICKET_MESSAGING_UNAVAILABLE} hideResolve />
          </>
        )}
      </div>

      <TicketDeleteModal
        ticket={ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onDeleted={() => router.push(ROUTES.MY_TICKETS)}
      />
    </div>
  );
}
