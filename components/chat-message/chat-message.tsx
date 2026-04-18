"use client";

import { useState, useRef, memo } from "react";
import { Bot, User, ChevronDown, Brain, XCircle, Loader2 } from "lucide-react";
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
    <div className={cn("group/msg mb-4 flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-th-accent-bg mt-0.5">
          <Bot className="h-3.5 w-3.5 text-th-accent" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5 min-w-0", isUser ? "items-end max-w-[85%] lg:max-w-[80%]" : "items-start max-w-[95%] lg:max-w-full")}>
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

        {/* Message bubble */}
        <div className={cn(
          "relative rounded-2xl px-4 py-2.5 text-sm max-w-full overflow-hidden",
          isUser ? "bg-blue-600 text-white" : "bg-th-panel text-th-fg-s border border-th-border/60"
        )}>
          {!isUser ? (
            m.content ? (
              <div className="prose prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5">
                <MarkdownContent content={m.content} />
              </div>
            ) : (isLoading || isStreaming) ? (
              <div className="flex items-center gap-2 text-th-fg-m">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isReasoning ? "Ожидание ответа..." : "Генерация ответа..."}</span>
              </div>
            ) : m.error ? null : (
              <div className="text-th-fg-f italic text-xs">Пустой ответ</div>
            )
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
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

      {/* User avatar */}
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-th-subtle mt-0.5">
          <User className="h-3.5 w-3.5 text-th-fg-s" />
        </div>
      )}
    </div>
  );
});

// Default export for backward compatibility
export default ChatMessage;
