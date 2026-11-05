"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { MessageCircleQuestion } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { dispatchTicketCreated } from "./draft";
import type { Ticket } from "./types";

// Drawer s chatem (Base UI, markdown, formulář tiketu) nemá co dělat ve First
// Load JS každé stránky — dotáhne se vlastním chunkem až po hydrataci.
const TicketsSidebar = dynamic(
  () => import("./TicketsSidebar").then((m) => m.TicketsSidebar),
  { ssr: false },
);

/** Uživatel v tomto tabu už chat otevřel — uvítání pak nesvítí jako nepřečtené. */
const SEEN_STORAGE_KEY = "praktik-ai:wiki-chat-seen";

interface SupportChatContextValue {
  /** Otevře nápovědu; s tiketem ukáže nad AI chatem i jeho konverzaci. */
  openSupportChat: (ticket?: Ticket | null) => void;
}

const SupportChatContext = createContext<SupportChatContextValue | null>(null);

export function useSupportChat(): SupportChatContextValue {
  const context = useContext(SupportChatContext);
  if (!context) {
    throw new Error("useSupportChat must be used within a SupportChatProvider.");
  }
  return context;
}

/**
 * Plovoucí tlačítko „Nápověda a podpora" vpravo dole + jediný panel s AI
 * chatem nad wiki pro celou veřejnou část (přihlášené i nepřihlášené).
 * Stránky panel otevírají přes `useSupportChat()`, takže chat má jedno
 * vlákno a nikde nevznikne druhá instance se zastaralou historií.
 *
 * Aby tlačítko nepřekáželo: sedí v okraji obsahu, z-30 je pod hlavičkou,
 * poznámkovým panelem modulu (z-40) i všemi dialogy, při otevřeném panelu
 * se schová a další plovoucí prvky se staví nad něj
 * (`--support-fab-clearance` v globals.css).
 */
export function SupportChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [unread, setUnread] = useState(false);

  const openRef = useRef(open);
  openRef.current = open;

  // Dokud uživatel chat v tomto tabu neotevřel, je uvítací zpráva
  // „nepřečtená". sessionStorage na serveru není, tečka proto naskočí
  // až po hydrataci (s animací, takže to nevypadá jako skok).
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SEEN_STORAGE_KEY)) setUnread(true);
    } catch {
      // bez úložiště tečku nezobrazujeme
    }
  }, []);

  const openSupportChat = useCallback((nextTicket: Ticket | null = null) => {
    setTicket(nextTicket);
    setOpen(true);
    setUnread(false);
    try {
      sessionStorage.setItem(SEEN_STORAGE_KEY, "1");
    } catch {
      // tečka se pak jen ukáže znovu v dalším tabu
    }
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setTicket(null);
  }, []);

  // Odpověď, která dorazí po zavření panelu (zavřel ho během „AI píše…"),
  // zůstane označená jako nepřečtená.
  const handleAiAnswer = useCallback(() => {
    if (!openRef.current) setUnread(true);
  }, []);

  const value = useMemo(() => ({ openSupportChat }), [openSupportChat]);

  return (
    <SupportChatContext.Provider value={value}>
      {children}

      <Button
        variant="plain"
        onClick={() => openSupportChat()}
        aria-label={unread ? "Nápověda a podpora (nová zpráva)" : "Nápověda a podpora"}
        title="Nápověda a podpora"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "fixed right-(--support-fab-offset) bottom-(--support-fab-offset) z-30 size-(--support-fab-size) rounded-full p-0",
          "bg-gradient-r text-primary-foreground shadow-lg duration-200 hover:shadow-xl hover:brightness-105",
          open && "pointer-events-none scale-90 opacity-0",
        )}
      >
        <MessageCircleQuestion className="size-6 sm:size-7" strokeWidth={2} />
        {unread && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive ring-[3px] ring-background animate-in fade-in zoom-in-50 sm:size-[1.125rem]"
          />
        )}
      </Button>

      <TicketsSidebar
        ticket={ticket}
        open={open}
        onClose={handleClose}
        onTicketCreated={dispatchTicketCreated}
        onAiAnswer={handleAiAnswer}
      />
    </SupportChatContext.Provider>
  );
}
