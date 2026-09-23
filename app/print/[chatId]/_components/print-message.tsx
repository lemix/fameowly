"use client";

import type { ChatMessageData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/chat-message/markdown-content";
import { useLocalDateTime } from "@/hooks/use-local-datetime";

// ─── Constants ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<ChatMessageData["role"], string> = {
  user: "Пользователь",
  assistant: "Ассистент",
};

// ─── Component ───────────────────────────────────────────────────────

/** One exchange turn laid out for paper: no bubbles, no hover affordances. */
export function PrintMessage({ message }: { message: ChatMessageData }) {
  const time = useLocalDateTime(message.createdAt);
  const isUser = message.role === "user";
  const attachments = message.attachments ?? [];
  const sources = message.grounding?.sources ?? [];

  return (
    <article className="print-message border-t border-th-border pt-4">
      <header className="mb-2 flex items-baseline gap-2">
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            isUser ? "text-th-accent" : "text-th-fg-m"
          )}
        >
          {ROLE_LABELS[message.role]}
        </span>
        <span className="text-[11px] text-th-fg-f">{time}</span>
      </header>

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap items-start gap-2">
          {attachments.map((att, i) =>
            att.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={att.url}
                alt={att.name}
                className="max-h-48 rounded-lg border border-th-border-s object-contain"
              />
            ) : (
              <span
                key={i}
                className="rounded-lg border border-th-border-s bg-th-subtle px-2.5 py-1 text-xs text-th-fg-s"
              >
                {att.name}
              </span>
            )
          )}
        </div>
      )}

      {isUser ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-th-fg">
          {message.content}
        </p>
      ) : (
        <div className="prose prose-sm max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <MarkdownContent content={message.content} />
        </div>
      )}

      {sources.length > 0 && (
        <section className="mt-3 border-l-2 border-th-border pl-3">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-th-fg-m">
            Источники
          </h3>
          <ol className="space-y-0.5 text-[11px] text-th-fg-m">
            {sources.map((source, idx) => (
              <li key={source.uri}>
                {idx + 1}. {source.title || source.uri}
                <span className="ml-1 break-all text-th-fg-f">{source.uri}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
