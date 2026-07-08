"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket as TicketIcon } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { TicketCard } from "./TicketCard";
import { listMyTickets } from "./api";
import { Ticket } from "./types";

interface ProfileTicketsCardProps {
  /** Kliknutí na „Zobrazit detail" tiketu (otevře chat sidebar). */
  onTicketDetail: (ticket: Ticket) => void;
  /** Kolik tiketů karta maximálně zobrazí. */
  limit?: number;
}

/**
 * Karta „Moje tikety" na profilové stránce — podle mockupu. Kliknutí na
 * hlavičku vede na /moje-tikety, tlačítka tiketů otevírají chat sidebar.
 */
export function ProfileTicketsCard({ onTicketDetail, limit = 3 }: ProfileTicketsCardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMyTickets()
      .then((data) => {
        if (!cancelled) setTickets(data);
      })
      .catch(() => {
        if (!cancelled) setTickets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white rounded-xl shadow-sm p-5">
      <Link
        href={ROUTES.MY_TICKETS}
        className="flex items-center gap-2.5 mb-4 group"
        aria-label="Přejít na Moje tikety"
      >
        <TicketIcon size={22} className="text-gray-900" />
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
          Moje tikety
        </h2>
      </Link>

      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Načítání tiketů…</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Zatím nemáte žádné tikety.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.slice(0, limit).map((ticket) => (
            <TicketCard key={ticket.ticketId} ticket={ticket} onDetailClick={onTicketDetail} />
          ))}
        </div>
      )}
    </section>
  );
}
