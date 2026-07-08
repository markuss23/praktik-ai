"use client";

import { memo } from "react";
import Link from "next/link";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { formatTicketCode, formatTicketDateTime, Ticket } from "./types";

interface TicketCardProps {
  ticket: Ticket;
  /** Odkaz na detail — vykreslí tlačítko jako <Link>. */
  detailHref?: string;
  /** Callback po kliknutí na „Zobrazit detail" (např. otevření sidebaru). */
  onDetailClick?: (ticket: Ticket) => void;
  /** Skryje tlačítko „Zobrazit detail" (hlavička detailové stránky). */
  hideDetailButton?: boolean;
  /** Větší titulek pro hlavičku detailové stránky. */
  large?: boolean;
}

const DETAIL_BUTTON_CLASS =
  "px-4 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors";

/** Karta tiketu (seznam, profil i hlavička detailu) podle mockupu. */
export const TicketCard = memo(function TicketCard({
  ticket,
  detailHref,
  onDetailClick,
  hideDetailButton = false,
  large = false,
}: TicketCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-gray-400">
          {formatTicketCode(ticket.ticketId)}
        </span>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <h3
        className={`font-medium text-gray-900 line-clamp-2 ${
          large ? "text-xl" : "text-base"
        }`}
      >
        {ticket.title}
      </h3>

      <div className="flex items-end justify-between gap-3 mt-auto">
        <span className="text-xs text-gray-400">
          {formatTicketDateTime(ticket.createdAt)}
        </span>
        {!hideDetailButton &&
          (detailHref ? (
            <Link href={detailHref} className={DETAIL_BUTTON_CLASS}>
              Zobrazit detail
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onDetailClick?.(ticket)}
              className={DETAIL_BUTTON_CLASS}
            >
              Zobrazit detail
            </button>
          ))}
      </div>
    </div>
  );
});
