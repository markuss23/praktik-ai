"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket as TicketIcon } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { TicketCard } from "./TicketCard";
import { TicketDeleteModal } from "./TicketDeleteModal";
import { listMyTickets } from "./api";
import { Ticket } from "./types";

interface ProfileTicketsCardProps {
  /** Kliknutí na „Zobrazit detail" tiketu (otevře chat sidebar). */
  onTicketDetail: (ticket: Ticket) => void;
  /** Zavolá se po smazání tiketu (např. zavření sidebaru s jeho konverzací). */
  onTicketDeleted?: (ticket: Ticket) => void;
}

/**
 * Karta „Moje tikety" na profilové stránce — podle mockupu. Kliknutí na
 * hlavičku vede na /moje-tikety, tlačítka tiketů otevírají chat sidebar.
 */
export function ProfileTicketsCard({
  onTicketDetail,
  onTicketDeleted,
}: ProfileTicketsCardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  const openCount = tickets.filter((t) => t.status === "open").length;

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
    <section className="bg-card rounded-xl shadow-sm p-6">
      <Link
        href={ROUTES.MY_TICKETS}
        className="flex items-center gap-2 mb-5 group"
        aria-label="Přejít na Moje tikety"
      >
        <TicketIcon className="size-5 text-foreground" />
        <h3 className="text-base font-bold text-foreground group-hover:text-gradient-r transition-colors">
          Moje tikety
        </h3>
        {openCount > 0 && (
          <span
            title={`Nevyřešené tikety: ${openCount}`}
            className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive/10 px-1.5 text-xs font-medium text-destructive"
          >
            {openCount}
          </span>
        )}
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Načítání tiketů…</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Zatím nemáte žádné tikety.
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.ticketId}
              ticket={ticket}
              onDetailClick={onTicketDetail}
              onDelete={setTicketToDelete}
            />
          ))}
        </div>
      )}

      <TicketDeleteModal
        ticket={ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onDeleted={(deleted) => {
          setTickets((prev) => prev.filter((t) => t.ticketId !== deleted.ticketId));
          onTicketDeleted?.(deleted);
        }}
      />
    </section>
  );
}
