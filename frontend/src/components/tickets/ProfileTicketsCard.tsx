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
}

/**
 * Karta „Moje tikety" na profilové stránce — podle mockupu. Kliknutí na
 * hlavičku vede na /moje-tikety, tlačítka tiketů otevírají chat sidebar.
 */
export function ProfileTicketsCard({ onTicketDetail }: ProfileTicketsCardProps) {
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
    <section className="bg-white rounded-xl shadow-sm p-6">
      <Link
        href={ROUTES.MY_TICKETS}
        className="flex items-center gap-2 mb-5 group"
        aria-label="Přejít na Moje tikety"
      >
        <TicketIcon className="w-5 h-5 text-gray-700" />
        <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
          Moje tikety
        </h3>
      </Link>

      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Načítání tiketů…</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Zatím nemáte žádné tikety.
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.ticketId} ticket={ticket} onDetailClick={onTicketDetail} />
          ))}
        </div>
      )}
    </section>
  );
}
