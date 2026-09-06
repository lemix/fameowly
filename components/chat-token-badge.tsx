"use client";

import { Coins, AlertTriangle } from "lucide-react";
import { useChatUsage } from "@/hooks/use-chat-usage";
import type { ChatStatus } from "@/lib/types";
import { Tooltip } from "./ui/tooltip";

interface ChatTokenBadgeProps {
  chatId: string | null;
  /** Chat status — stats are refetched when a generation completes */
  status?: ChatStatus;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Warning level based on context window size */
function getContextLevel(tokens: number): "ok" | "warn" | "critical" {
  if (tokens >= 200_000) return "critical";
  if (tokens >= 100_000) return "warn";
  return "ok";
}

const LEVEL_STYLES = {
  ok: "bg-th-accent/10 text-th-accent",
  warn: "bg-amber-500/15 text-amber-500",
  critical: "bg-red-500/15 text-red-400",
} as const;

const LEVEL_HINTS = {
  ok: null,
  warn: "⚠ Контекст >100K — запросы дорожают",
  critical: "🔴 Контекст >200K — рекомендуется начать новый чат",
} as const;

/**
 * Context and token indicator in the chat header.
 * Totals never shrink — deleting a message does not give spent tokens back —
 * while the context size becomes approximate until the next reply.
 */
export function ChatTokenBadge({ chatId, status }: ChatTokenBadgeProps) {
  const usage = useChatUsage(chatId, status);

  if (usage.requests === 0) return null;

  const level = getContextLevel(usage.contextTokens);
  const hint = LEVEL_HINTS[level];
  const approx = usage.contextStale ? "~" : "";
  const totalTokens = usage.promptTokens + usage.completionTokens;

  const tooltip = (
    <span className="block space-y-1">
      <span className="block">
        Контекст: <b>{approx}{usage.contextTokens.toLocaleString("ru-RU")}</b> токенов
      </span>
      <span className="block">
        Отправлено: <b>{usage.promptTokens.toLocaleString("ru-RU")}</b> · получено:{" "}
        <b>{usage.completionTokens.toLocaleString("ru-RU")}</b>
      </span>
      <span className="block">
        Запросов: <b>{usage.requests}</b>
      </span>
      {usage.contextStale && (
        <span className="block pt-1 text-th-fg-s">
          Сообщения удалялись — размер контекста приблизительный до следующего ответа
        </span>
      )}
      {hint && <span className="block pt-1 text-th-fg-s">{hint}</span>}
    </span>
  );

  return (
    <Tooltip content={tooltip}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors ${LEVEL_STYLES[level]}`}
        data-testid="chat-token-badge"
      >
        {level === "ok" ? <Coins className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {approx}
        {formatTokens(usage.contextTokens > 0 ? usage.contextTokens : totalTokens)}
      </span>
    </Tooltip>
  );
}
