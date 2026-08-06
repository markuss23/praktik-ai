"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircleQuestion, SendHorizontal, X } from "lucide-react";

import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Input,
} from "@/components/ui";
import { TicketConversation } from "./TicketConversation";
import { TICKET_MESSAGING_UNAVAILABLE } from "./api";
import { buildTicketConversation, formatTicketCode, Ticket } from "./types";

interface TicketsSidebarProps {
  /** Tiket, jehož konverzace se zobrazí; null = sidebar zavřený. */
  ticket: Ticket | null;
  onClose: () => void;
  /** Odeslání zprávy; bez handleru je vstup deaktivovaný s vysvětlením. */
  onSend?: (text: string) => Promise<void> | void;
}

function conversationStartLabel(createdAt: Date): string {
  const time = createdAt.toLocaleTimeString("cs-CZ", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isToday = createdAt.toDateString() === new Date().toDateString();
  const day = isToday ? "dnes" : createdAt.toLocaleDateString("cs-CZ");
  return `Konverzace zahájena ${day} v ${time}`;
}

/**
 * Pravý panel „Nápověda a podpora" s konverzací tiketu — kitový `Drawer`
 * (swipeDirection="right"), takže overlay, stacking i gesta řeší Base UI.
 * Otevírá se z karty Moje tikety na profilové stránce.
 */
export function TicketsSidebar({ ticket, onClose, onSend }: TicketsSidebarProps) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const canSend = Boolean(onSend);

  // Reset rozepsané zprávy při přepnutí tiketu / otevření.
  useEffect(() => {
    setMessage("");
    setNotice(null);
    setSending(false);
  }, [ticket?.ticketId]);

  const messages = useMemo(
    () => (ticket ? buildTicketConversation(ticket) : []),
    [ticket],
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !ticket || !onSend) return;

    setNotice(null);
    setSending(true);
    try {
      await onSend(trimmed);
      setMessage("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Zprávu se nepodařilo odeslat.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer
      open={ticket !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      swipeDirection="right"
    >
      <DrawerContent aria-label="Nápověda a podpora">
        {ticket && (
          <>
            <DrawerHeader className="flex-row items-center gap-3 border-b pb-4 text-left">
              <span className="flex size-10 items-center justify-center rounded-full bg-gradient-r/15 text-gradient-r">
                <MessageCircleQuestion className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-sm font-semibold">Nápověda a podpora</DrawerTitle>
                <DrawerDescription className="text-xs">
                  Na dotaz odpoví lektor kurzu
                </DrawerDescription>
              </div>
              <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label="Zavřít" />}>
                <X />
              </DrawerClose>
            </DrawerHeader>

            {/* Konverzace */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-1 text-center text-[11px] text-muted-foreground">
                {conversationStartLabel(ticket.createdAt)}
              </p>
              <p className="mb-4 text-center text-[11px] text-muted-foreground">
                {formatTicketCode(ticket.ticketId)} · {ticket.title}
              </p>
              <TicketConversation messages={messages} compact />
            </div>

            {/* Vstup pro zprávu */}
            <div className="border-t p-3">
              {!canSend && (
                <p className="mb-2 text-xs text-muted-foreground">{TICKET_MESSAGING_UNAVAILABLE}</p>
              )}
              {notice && <p className="mb-2 text-xs text-destructive">{notice}</p>}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={canSend ? "Napište zprávu…" : "Psaní zpráv zatím není dostupné"}
                  disabled={sending || !canSend}
                  className="flex-1 rounded-full px-4"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 rounded-full"
                  disabled={sending || !canSend || message.trim().length < 1}
                  aria-label="Odeslat zprávu"
                >
                  <SendHorizontal />
                </Button>
              </form>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
