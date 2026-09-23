"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Ticket as TicketIcon } from "lucide-react";
import { Button, TicketCardsSkeleton } from "@/components/ui";
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
  /** Otevře nápovědu s AI asistentem bez vazby na konkrétní tiket. */
  onOpenHelp?: () => void;
}

/**
 * Karta „Moje tikety" na profilové stránce — podle mockupu. Kliknutí na
 * hlavičku vede na /moje-tikety, tlačítka tiketů otevírají chat sidebar.
 */
export function ProfileTicketsCard({
  onTicketDetail,
  onTicketDeleted,
  onOpenHelp,
}: ProfileTicketsCardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();

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

  // V kartě mají být vidět maximálně dva tikety, zbytek se doroluje kolečkem.
  // Výšku neurčujeme napevno — karty jsou různě vysoké podle délky názvu,
  // tak měříme první dvě a hlídáme je přes ResizeObserver.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || tickets.length <= 2) {
      setMaxHeight(undefined);
      return;
    }

    const measure = () => {
      const [first, second] = Array.from(list.children) as HTMLElement[];
      if (!first || !second) return;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      setMaxHeight(first.offsetHeight + gap + second.offsetHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    Array.from(list.children)
      .slice(0, 2)
      .forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [tickets]);

  return (
    <section className="bg-card rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Link
          href={ROUTES.MY_TICKETS}
          className="flex flex-1 items-center gap-2 min-w-0 group"
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
        {onOpenHelp && (
          <Button variant="ghost" size="sm" onClick={onOpenHelp}>
            <Bot data-icon="inline-start" />
            Zeptat se AI
          </Button>
        )}
      </div>

      {loading ? (
        <TicketCardsSkeleton count={2} />
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Zatím nemáte žádné tikety.
        </p>
      ) : (
        <>
          {/* `overscroll-contain` drží kolečko uvnitř seznamu, dokud je kam
              rolovat — stránka pod kartou se rozjede až na konci. */}
          <div
            ref={listRef}
            style={{ maxHeight }}
            className="flex flex-col gap-3 overflow-y-auto overscroll-contain pr-1"
          >
            {tickets.map((ticket) => (
              // `shrink-0` je tu podstatný: `TicketCard` má kvůli mřížce na
              // /moje-tikety `h-full`, takže by se jako flex položka nechal
              // stlačit do stropu seznamu a ořízl by datum i název problému.
              <div key={ticket.ticketId} className="shrink-0">
                <TicketCard
                  ticket={ticket}
                  onDetailClick={onTicketDetail}
                  onDelete={setTicketToDelete}
                />
              </div>
            ))}
          </div>

          <Link
            href={ROUTES.MY_TICKETS}
            className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-gradient-r transition-opacity hover:opacity-80"
          >
            Zobrazit všechny ({tickets.length})
            <ChevronRight className="size-4" />
          </Link>
        </>
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
