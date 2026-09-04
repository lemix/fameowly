"use client";

import { Coins, AlertTriangle } from "lucide-react";
import { useChatUsage } from "@/hooks/use-chat-usage";
import { formatCost } from "@/lib/pricing";
import type { ChatStatus } from "@/lib/types";
import { Tooltip } from "./ui/tooltip";

interface ChatUsageBadgeProps {
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
 * Compact context & cost indicator shown in the chat header.
 * Only renders when extension plugins are active and there's usage data.
 * Cost comes from stored per-request snapshots, so later price edits in the
 * admin panel never change an already billed chat.
 */
export function ChatUsageBadge({ chatId, status }: ChatUsageBadgeProps) {
  const { usage, hasPlugins } = useChatUsage(chatId, status);

  if (!hasPlugins || usage.requestCount === 0) return null;

  const contextTokens = usage.lastContextTokens;
  const level = getContextLevel(contextTokens);
  const hint = LEVEL_HINTS[level];

  const tooltip = (
    <span className="block space-y-1">
      <span className="block">
        Контекст: <b>{contextTokens.toLocaleString("ru-RU")}</b> токенов
      </span>
      <span className="block">
        Всего обработано: <b>{usage.totalTokens.toLocaleString("ru-RU")}</b> токенов
      </span>
      <span className="block">
        Запросов: <b>{usage.requestCount}</b>
      </span>
      <span className="block">
        Стоимость чата: <b>{formatCost(usage.totalCost)}</b>
      </span>
      {hint && <span className="block pt-1 text-th-fg-s">{hint}</span>}
    </span>
  );

  return (
    <Tooltip content={tooltip}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors ${LEVEL_STYLES[level]}`}
        data-testid="chat-usage-badge"
      >
        {level === "ok" ? <Coins className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {formatTokens(contextTokens > 0 ? contextTokens : usage.totalTokens)}
        {usage.totalCost > 0 && (
          <span className="opacity-70">· {formatCost(usage.totalCost)}</span>
        )}
      </span>
    </Tooltip>
  );
}
