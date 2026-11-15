"use client";

import { lazy, memo, Suspense } from "react";
import { Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime, TicketMessage } from "./types";

// react-markdown potřebují jen AI bubliny — do hlavního balíku tiketů ho
// netaháme. Než se chunk načte, fallback ukáže holý text, takže bublina
// nepoletí (žádný layout shift).
const ChatMarkdown = lazy(() =>
  import("./ChatMarkdown").then((m) => ({ default: m.ChatMarkdown })),
);

interface TicketConversationProps {
  messages: TicketMessage[];
  /** Kompaktnější rozměry pro chat sidebar. */
  compact?: boolean;
}

function Avatar({ author }: { author: TicketMessage["author"] }) {
  const Icon = author === "ai" ? Bot : UserRound;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-muted-foreground">
      <Icon size={16} />
    </span>
  );
}

// Technické informace přiložené ke zprávě (prohlížeč, rozlišení apod.).
function MessageDetails({ details }: { details?: string[] }) {
  if (!details || details.length === 0) return null;
  return (
    <div className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground whitespace-normal [overflow-wrap:anywhere]">
      <p className="font-medium">Technické informace</p>
      <ul>
        {details.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

// Interní poznámka staffu má čárkovaný okraj, ať se nezamění se zprávou pro studenta.
const INTERNAL_BUBBLE = "border border-dashed border-warning bg-warning/10";

/**
 * Vlákno zpráv k tiketu. Zprávy uživatele vpravo (fialová bublina),
 * podpora a AI vlevo s avatarem — podle mockupu detailu tiketu.
 */
export const TicketConversation = memo(function TicketConversation({
  messages,
  compact = false,
}: TicketConversationProps) {
  const bubbleMax = compact ? "max-w-[85%]" : "max-w-[75%]";

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        if (message.author === "user") {
          return (
            <div key={message.id} className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>
                  {message.internal ? "Interní poznámka · " : ""}
                  Vy{message.timestamp ? ` ${formatMessageTime(message.timestamp)}` : ""}
                </span>
                <UserRound size={14} />
              </div>
              <div
                className={cn(
                  bubbleMax,
                  "rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words",
                  message.internal ? INTERNAL_BUBBLE : "bg-gradient-r/10",
                )}
              >
                {message.text}
                <MessageDetails details={message.details} />
              </div>
            </div>
          );
        }

        return (
          <div key={message.id} className="flex items-start gap-2">
            <Avatar author={message.author} />
            <div className={`${bubbleMax} flex flex-col gap-1`}>
              {message.authorName && (
                <span className="text-[11px] text-muted-foreground">
                  {message.authorName}
                  {message.internal ? " · interní poznámka" : ""}
                  {message.timestamp ? ` · ${formatMessageTime(message.timestamp)}` : ""}
                </span>
              )}
              <div
                className={cn(
                  "rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-foreground break-words",
                  message.author === "ai"
                    ? "border border-border bg-card"
                    : cn("whitespace-pre-wrap", message.internal ? INTERNAL_BUBBLE : "bg-muted"),
                )}
              >
                {message.author === "ai" ? (
                  <Suspense
                    fallback={<span className="whitespace-pre-wrap">{message.text}</span>}
                  >
                    <ChatMarkdown text={message.text} />
                  </Suspense>
                ) : (
                  <>
                    {message.text}
                    <MessageDetails details={message.details} />
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
