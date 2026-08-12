"use client";

import { memo } from "react";
import { Bot, UserRound } from "lucide-react";
import { formatMessageTime, TicketMessage } from "./types";

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
                  Vy{message.timestamp ? ` ${formatMessageTime(message.timestamp)}` : ""}
                </span>
                <UserRound size={14} />
              </div>
              <div
                className={`${bubbleMax} rounded-2xl rounded-tr-sm bg-gradient-r/10 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words`}
              >
                {message.text}
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
                  {message.timestamp ? ` · ${formatMessageTime(message.timestamp)}` : ""}
                </span>
              )}
              <div
                className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words ${
                  message.author === "ai"
                    ? "border border-border bg-card"
                    : "bg-muted"
                }`}
              >
                {message.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
