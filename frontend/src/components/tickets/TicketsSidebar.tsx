"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircleQuestion, SendHorizontal, X } from "lucide-react";
import { useModalDismiss } from "@/hooks/useModalDismiss";
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
 * Pravý sidebar „Nápověda a podpora" s konverzací tiketu — podle mockupu.
 * Otevírá se z karty Moje tikety na profilové stránce.
 */
export function TicketsSidebar({ ticket, onClose, onSend }: TicketsSidebarProps) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const canSend = Boolean(onSend);

  const isOpen = ticket !== null;
  useModalDismiss(isOpen, onClose);

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
    <AnimatePresence>
      {ticket && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="absolute inset-y-0 right-0 w-full max-w-[380px] bg-white border-l border-gray-200 shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Nápověda a podpora"
          >
            {/* Hlavička */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <MessageCircleQuestion size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Nápověda a podpora</p>
                <p className="text-xs text-gray-500">Na dotaz odpoví lektor kurzu</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zavřít"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Konverzace */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="text-center text-[11px] text-gray-400 mb-1">
                {conversationStartLabel(ticket.createdAt)}
              </p>
              <p className="text-center text-[11px] text-gray-400 mb-4">
                {formatTicketCode(ticket.ticketId)} · {ticket.title}
              </p>
              <TicketConversation messages={messages} compact />
            </div>

            {/* Vstup pro zprávu */}
            <div className="border-t border-gray-100 p-3">
              {!canSend && (
                <p className="mb-2 text-xs text-gray-500">{TICKET_MESSAGING_UNAVAILABLE}</p>
              )}
              {notice && <p className="mb-2 text-xs text-red-600">{notice}</p>}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={canSend ? "Napište zprávu…" : "Psaní zpráv zatím není dostupné"}
                  disabled={sending || !canSend}
                  className="flex-1 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending || !canSend || message.trim().length < 1}
                  aria-label="Odeslat zprávu"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40"
                >
                  <SendHorizontal size={16} />
                </button>
              </form>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
