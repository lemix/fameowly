"use client";

import { useState, useRef, memo } from "react";
import { ChevronDown, Brain, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageData } from "@/lib/types";
import { MarkdownContent } from "./markdown-content";
import { AttachmentPreview } from "./attachment-preview";
import { MessageActions } from "./message-actions";

// Re-export for backward compatibility
export type { MessageData } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: MessageData;
  isLoading?: boolean;
  isStreaming?: boolean;
  isReasoning?: boolean;
  onDelete?: (messageId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export const ChatMessage = memo(function ChatMessage({
  message: m,
  isLoading,
  isStreaming,
  isReasoning,
  onDelete,
}: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand reasoning during streaming
  const autoExpandedRef = useRef(false);
  if (isReasoning && !autoExpandedRef.current) {
    autoExpandedRef.current = true;
  }
  const showExpanded = expanded || (isReasoning && autoExpandedRef.current);

  const isUser = m.role === "user";

  return (
    <div className={cn("group/msg mb-6 flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex min-w-0 flex-col gap-2.5", isUser ? "max-w-[85%] items-end lg:max-w-[70%]" : "w-full items-start")}>
        {/* Attachments */}
        {m.attachments && m.attachments.length > 0 && (
          <AttachmentPreview attachments={m.attachments} />
        )}

        {/* Reasoning block */}
        {!isUser && (m.reasoning || isReasoning) && (
          <div className={cn(
            "w-full rounded-lg border bg-th-purple-bg",
            isReasoning ? "border-th-purple-muted/40" : "border-th-purple-muted/20"
          )}>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-th-purple hover:text-th-purple-fg transition"
            >
              <Brain className={cn("h-3 w-3", isReasoning && "animate-pulse")} />
              <span>{isReasoning ? "Нейросеть рассуждает..." : "Размышления"}</span>
              {m.reasoning && (
                <span className="text-[10px] text-th-purple-muted/60 ml-1">
                  ~{Math.ceil(m.reasoning.length / 3)} токенов
                </span>
              )}
              {isReasoning && (
                <span className="ml-1 flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-th-purple animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1 w-1 rounded-full bg-th-purple animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1 w-1 rounded-full bg-th-purple animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
              <ChevronDown className={cn("ml-auto h-3 w-3 transition-transform", showExpanded && "rotate-180")} />
            </button>
            {showExpanded && m.reasoning && (
              <div className="border-t border-th-purple-muted/20 px-3 py-2 text-xs text-th-fg-m leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {m.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Error block */}
        {!isUser && m.error && (
          <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-red-400">
              <XCircle className="h-3 w-3 shrink-0" />
              <span>{m.error}</span>
            </div>
          </div>
        )}

        {/* Content — user text sits in a bubble, assistant answers run plain on the page */}
        <div className={cn(
          "relative max-w-full overflow-hidden text-sm leading-[21px]",
          isUser ? "rounded-[10px] bg-th-bubble px-5 py-5 text-th-fg" : "w-full text-th-fg"
        )}>
          {!isUser ? (
            m.content ? (
              <div className="prose prose-sm max-w-none leading-[21px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5">
                <MarkdownContent content={m.content} />
              </div>
            ) : (isLoading || isStreaming) ? (
              <div className="flex items-center gap-2 text-th-fg-m">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isReasoning ? "Ожидание ответа..." : "Генерация ответа..."}</span>
              </div>
            ) : m.error ? null : (
              <div className="text-xs italic text-th-fg-f">Пустой ответ</div>
            )
          ) : (
            <p className="whitespace-pre-wrap">{m.content}</p>
          )}
        </div>

        {/* Actions — assistant messages with content */}
        {!isUser && m.content && (
          <MessageActions role="assistant" content={m.content} messageId={m.id} onDelete={onDelete} />
        )}

        {/* Actions — user messages */}
        {isUser && onDelete && (
          <MessageActions role="user" content={m.content} messageId={m.id} onDelete={onDelete} />
        )}
      </div>
    </div>
  );
});

// Default export for backward compatibility
export default ChatMessage;
