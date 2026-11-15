"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { TicketMessageItem } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import {
  addTicketMessage,
  buildTicketConversation,
  formatTicketCode,
  getTicket,
  listTicketMessages,
  Ticket,
  TicketCard,
  TicketConversation,
  TicketDeleteModal,
  TicketReplyBox,
  updateTicketStatus,
} from "@/components/tickets";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = Number(params.id);
  const { user, loading: authLoading, login, isAuthenticated } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [thread, setThread] = useState<TicketMessageItem[]>([]);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      login(window.location.pathname);
    }
  }, [authLoading, user, login]);

  useEffect(() => {
    if (!isAuthenticated || !Number.isFinite(ticketId)) {
      if (!Number.isFinite(ticketId)) setLoading(false);
      return;
    }
    let cancelled = false;
    // Tiket i vlákno paralelně; když selže jen vlákno, hlavička tiketu zůstane.
    Promise.allSettled([getTicket(ticketId), listTicketMessages(ticketId)]).then(
      ([ticketResult, threadResult]) => {
        if (cancelled) return;
        setTicket(ticketResult.status === "fulfilled" ? ticketResult.value : null);
        if (threadResult.status === "fulfilled") {
          setThread(threadResult.value);
          setThreadError(null);
        } else {
          setThreadError(
            threadResult.reason instanceof Error
              ? threadResult.reason.message
              : "Konverzaci se nepodařilo načíst.",
          );
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ticketId]);

  const messages = useMemo(
    () => (ticket ? buildTicketConversation(ticket, thread) : []),
    [ticket, thread],
  );

  const handleSend = async (text: string) => {
    if (!ticket) return;
    const created = await addTicketMessage(ticket.ticketId, text);
    setThread((prev) => [...prev, created]);
    // Odpověď na vyřešený tiket ho backend vrátí do in_progress.
    if (ticket.status === "resolved") {
      setTicket((prev) => (prev ? { ...prev, status: "in_progress" } : prev));
    }
  };

  // Uzavřít jde jen vyřešený tiket, tím zakladatel potvrdí, že je hotovo.
  const handleCloseTicket = async () => {
    if (!ticket) return;
    const updated = await updateTicketStatus(ticket.ticketId, "closed");
    setTicket((prev) => (prev ? { ...updated, courseTitle: prev.courseTitle } : updated));
  };

  // Do uzavřeného tiketu backend zprávu nepustí (409), vyřešený odpověď znovu otevře.
  const replyDisabledNotice =
    ticket?.status === "closed"
      ? "Tiket je uzavřený, další zprávy do něj už nelze přidat."
      : undefined;
  const replyHint =
    ticket?.status === "resolved"
      ? "Tiket je vyřešený. Pokud je vše v pořádku, potvrďte uzavření. Když odpovíte, znovu se otevře."
      : undefined;

  return (
    <div className="py-8">
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: "1440px", width: "100%" }}
      >
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          {" / "}
          <Link href={ROUTES.MY_TICKETS} className="hover:text-foreground transition-colors">
            Moje tikety
          </Link>
          {" / "}
          <span className="text-foreground">
            {Number.isFinite(ticketId) ? formatTicketCode(ticketId) : "Tiket"}
          </span>
        </p>

        {loading ? (
          <div className="bg-card rounded-xl shadow-sm p-8 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Načítání tiketu…</p>
          </div>
        ) : !ticket ? (
          <div className="bg-card rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-muted-foreground">Tiket nenalezen.</p>
            <Link
              href={ROUTES.MY_TICKETS}
              className="inline-block mt-3 text-sm font-medium text-gradient-r hover:text-gradient-r"
            >
              Zpět na Moje tikety
            </Link>
          </div>
        ) : (
          <>
            {/* Hlavička tiketu */}
            <TicketCard ticket={ticket} hideDetailButton large onDelete={setTicketToDelete} />

            {/* Konverzace */}
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">Konverzace</h2>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
              {threadError ? (
                <p className="text-sm text-destructive">{threadError}</p>
              ) : (
                <TicketConversation messages={messages} />
              )}
            </div>

            <TicketReplyBox
              onSend={handleSend}
              onResolve={ticket.status === "resolved" ? handleCloseTicket : undefined}
              resolveLabel="Potvrdit vyřešení a uzavřít"
              disabledNotice={replyDisabledNotice}
              hint={replyHint}
            />
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
