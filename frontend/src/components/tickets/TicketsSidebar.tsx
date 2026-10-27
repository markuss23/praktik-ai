"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Eraser, MessageCircleQuestion, SendHorizontal, TicketPlus, X } from "lucide-react";

import { ROUTES } from "@/lib/constants";
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
import { wikiChat } from "@/lib/api-client";
import { TicketConversation } from "./TicketConversation";
import { TicketCreateModal } from "./TicketCreateModal";
import { TICKET_MESSAGING_UNAVAILABLE } from "./api";
import { buildTicketConversation, formatTicketCode, Ticket, TicketMessage } from "./types";

interface TicketsSidebarProps {
  /** Tiket, jehož konverzace se zobrazí nad AI chatem; null = jen nápověda. */
  ticket: Ticket | null;
  /**
   * Otevření panelu. Bez něj se panel řídí jen tiketem (zpětná kompatibilita),
   * s ním jde otevřít i čistá nápověda bez tiketu.
   */
  open?: boolean;
  onClose: () => void;
  /** Zavolá se po založení tiketu z eskalace („Nepomohlo? Založit tiket"). */
  onTicketCreated?: (ticket: Ticket) => void;
}

/**
 * Historie AI chatu. Endpoint `/agents/wiki-chat` je bezstavový (posílá se jen
 * aktuální zpráva), vlákno si proto drží klient — v sessionStorage, takže
 * přežije reload i přechod mezi stránkami a zmizí se zavřením tabu.
 */
const CHAT_STORAGE_KEY = "praktik-ai:wiki-chat";

const GREETING: TicketMessage = {
  id: "wiki-greeting",
  author: "ai",
  text: "Ahoj! 👋 Jsem AI asistent Praktik AI. Odpovídám na otázky o projektu z naší wiki — zeptejte se na cokoliv.",
  authorName: "AI asistent",
};

type StoredMessage = Omit<TicketMessage, "timestamp"> & { timestamp?: string };

function readStoredMessages(): TicketMessage[] {
  if (typeof window === "undefined") return [GREETING];
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredMessage[]) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((m) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
      }));
    }
  } catch {
    // sessionStorage nemusí být dostupný (privátní okno, blokované úložiště)
  }
  return [GREETING];
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

/** Název tiketu z dotazu — backend má limit 255 znaků, v UI zkracujeme dřív. */
function titleFromQuestion(question: string): string {
  const firstLine = question.split("\n")[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine;
}

/**
 * Pravý panel „Nápověda a podpora" — kitový `Drawer` (swipeDirection="right"),
 * takže overlay, stacking i gesta řeší Base UI.
 *
 * Panel vede AI chat nad projektovou wiki (`/agents/wiki-chat`); když odpověď
 * nestačí, vede odsud zkratka na založení tiketu s předvyplněným dotazem.
 * Otevřený nad tiketem ukáže nahoře i jeho konverzaci.
 */
export function TicketsSidebar({
  ticket,
  open,
  onClose,
  onTicketCreated,
}: TicketsSidebarProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<TicketMessage[]>(readStoredMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const isOpen = open ?? ticket !== null;

  const ticketMessages = useMemo(
    () => (ticket ? buildTicketConversation(ticket) : []),
    [ticket],
  );

  // Poslední dotaz uživatele — předvyplní se jím tiket při eskalaci.
  const lastQuestion = useMemo(
    () => messages.filter((m) => m.author === "user").at(-1)?.text ?? "",
    [messages],
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ukládání historie je best-effort, chat funguje i bez něj
    }
  }, [messages]);

  // Odrolování na konec při nové zprávě i při otevření panelu. Obsah drawru
  // se montuje až s animací, proto až v dalším snímku — jinak by ref byl null.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setError(null);
    setCreatedTicket(null);
    setMessage("");
    setMessages((prev) => [
      ...prev,
      { id: `q-${Date.now()}`, author: "user", text: trimmed, timestamp: new Date() },
    ]);
    setSending(true);
    try {
      const answer = await wikiChat(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          author: "ai",
          text: answer,
          authorName: "AI asistent",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odpověď se nepodařilo načíst.");
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setMessages([GREETING]);
    setError(null);
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      swipeDirection="right"
    >
      <DrawerContent aria-label="Nápověda a podpora">
        <DrawerHeader className="flex-row items-center gap-3 border-b pb-4 text-left">
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-r/15 text-gradient-r">
            <MessageCircleQuestion className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-sm font-semibold">Nápověda a podpora</DrawerTitle>
            <DrawerDescription className="text-xs">
              AI asistent odpovídá z projektové wiki
            </DrawerDescription>
          </div>
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Vymazat konverzaci s AI"
              title="Vymazat konverzaci s AI"
              onClick={handleClear}
              disabled={sending}
            >
              <Eraser />
            </Button>
          )}
          <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label="Zavřít" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Konverzace tiketu — jen když je panel otevřený nad tiketem. */}
          {ticket && (
            <>
              <p className="mb-1 text-center text-[11px] text-muted-foreground">
                {conversationStartLabel(ticket.createdAt)}
              </p>
              <p className="mb-4 text-center text-[11px] text-muted-foreground">
                {formatTicketCode(ticket.ticketId)} · {ticket.title}
              </p>
              <TicketConversation messages={ticketMessages} compact />
              <p className="mt-3 text-[11px] text-muted-foreground">
                {TICKET_MESSAGING_UNAVAILABLE}
              </p>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Bot className="size-3.5" />
                  AI asistent
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <TicketConversation messages={messages} compact />

          {sending && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)]">
                <Bot size={16} />
              </span>
              <span className="animate-pulse">AI píše odpověď…</span>
            </div>
          )}

          {error && <p className="mt-4 text-xs text-destructive">{error}</p>}

          {/* Eskalace — když odpověď nestačí, dotaz putuje na lektora. */}
          {lastQuestion && !sending && (
            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-3">
              {createdTicket ? (
                <p className="text-xs text-muted-foreground">
                  Tiket{" "}
                  <Link
                    href={`${ROUTES.MY_TICKETS}/${createdTicket.ticketId}`}
                    className="font-medium text-gradient-r hover:underline"
                  >
                    {formatTicketCode(createdTicket.ticketId)}
                  </Link>{" "}
                  byl založen — odpoví na něj lektor kurzu.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Nepomohlo? Předejte dotaz lektorovi kurzu.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setCreateOpen(true)}
                  >
                    <TicketPlus data-icon="inline-start" />
                    Založit tiket z dotazu
                  </Button>
                </>
              )}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Zeptejte se na cokoliv o projektu…"
              disabled={sending}
              className="flex-1 rounded-full px-4"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-full"
              disabled={sending || message.trim().length < 1}
              aria-label="Odeslat zprávu"
            >
              <SendHorizontal />
            </Button>
          </form>
        </div>

        {/* Uvnitř drawer stromu, aby Base UI dialog vyhodnotil jako vnořený
            (jinak by kliknutí v modalu zavřelo panel pod ním). */}
        <TicketCreateModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          initialTitle={titleFromQuestion(lastQuestion)}
          initialReason={lastQuestion}
          onCreated={(created) => {
            setCreatedTicket(created);
            onTicketCreated?.(created);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}
