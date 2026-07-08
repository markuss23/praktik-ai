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
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EFEFEF] text-gray-600">
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
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>
                  Vy{message.timestamp ? ` ${formatMessageTime(message.timestamp)}` : ""}
                </span>
                <UserRound size={14} />
              </div>
              <div
                className={`${bubbleMax} rounded-2xl rounded-tr-sm bg-purple-50 px-4 py-2.5 text-sm text-gray-800 whitespace-pre-wrap break-words`}
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
                <span className="text-[11px] text-gray-400">
                  {message.authorName}
                  {message.timestamp ? ` · ${formatMessageTime(message.timestamp)}` : ""}
                </span>
              )}
              <div
                className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 whitespace-pre-wrap break-words ${
                  message.author === "ai"
                    ? "border border-gray-200 bg-white"
                    : "bg-gray-100"
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
