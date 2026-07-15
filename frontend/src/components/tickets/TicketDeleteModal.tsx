"use client";

import { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/ui";
import { deleteTicket } from "./api";
import { formatTicketCode, Ticket } from "./types";

interface TicketDeleteModalProps {
  /** Tiket ke smazání; null = modal zavřený. */
  ticket: Ticket | null;
  onClose: () => void;
  /** Zavolá se po úspěšném smazání tiketu. */
  onDeleted: (ticket: Ticket) => void;
}

/**
 * Potvrzení smazání tiketu — obaluje sdílený ConfirmModal a volá API.
 * Chyba mazání se zobrazí místo potvrzovací zprávy, modal zůstane otevřený.
 */
export function TicketDeleteModal({ ticket, onClose, onDeleted }: TicketDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset stavu při otevření s jiným tiketem.
  useEffect(() => {
    setDeleting(false);
    setError(null);
  }, [ticket?.ticketId]);

  if (!ticket) return null;

  const handleConfirm = async () => {
    setError(null);
    setDeleting(true);
    try {
      await deleteTicket(ticket.ticketId);
      onDeleted(ticket);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tiket se nepodařilo smazat.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfirmModal
      isOpen
      variant="danger"
      title="Smazat tiket"
      message={
        error ??
        `Opravdu chcete smazat tiket ${formatTicketCode(ticket.ticketId)} „${ticket.title}“? Tato akce je nevratná.`
      }
      confirmLabel="Smazat"
      loading={deleting}
      onConfirm={() => void handleConfirm()}
      onCancel={() => {
        if (!deleting) onClose();
      }}
    />
  );
}
