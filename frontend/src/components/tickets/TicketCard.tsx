"use client";

import { memo } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./TicketStatusBadge";
import {
  formatTicketCode,
  formatTicketDateTime,
  isTicketDeletable,
  Ticket,
  TICKET_TYPE_LABELS,
} from "./types";

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
  /** Smazání tiketu; tlačítko se zobrazí jen u tiketů bez odpovědi. */
  onDelete?: (ticket: Ticket) => void;
}

/** Karta tiketu (seznam, profil i hlavička detailu) podle mockupu. */
export const TicketCard = memo(function TicketCard({
  ticket,
  detailHref,
  onDetailClick,
  hideDetailButton = false,
  large = false,
  onDelete,
}: TicketCardProps) {
  const meta = [ticket.courseTitle, TICKET_TYPE_LABELS[ticket.ticketType]]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {formatTicketCode(ticket.ticketId)}
          </span>
          <div className="flex items-center gap-1.5">
            <TicketStatusBadge status={ticket.status} />
            {onDelete && isTicketDeletable(ticket) && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onDelete(ticket)}
                aria-label="Smazat tiket"
                title="Smazat tiket"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>

        <div>
          <h3 className={cn("line-clamp-2 font-medium text-foreground", large ? "text-xl" : "text-base")}>
            {ticket.title}
          </h3>
          {meta && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{meta}</p>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {formatTicketDateTime(ticket.createdAt)}
          </span>
          {!hideDetailButton &&
            (detailHref ? (
              <Button render={<Link href={detailHref} />} nativeButton={false}>
                Zobrazit detail
              </Button>
            ) : (
              <Button onClick={() => onDetailClick?.(ticket)}>Zobrazit detail</Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
});
