"use client";

import { Coins, AlertTriangle } from "lucide-react";
import { useChatUsage } from "@/hooks/use-chat-usage";

interface ChatUsageBadgeProps {
  chatId: string | null;
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

/**
 * Compact context & cost indicator shown in the chat header.
 * Only renders when extension plugins are active and there's usage data.
 * Shows: context size (tokens) + cumulative cost + warning at thresholds.
 */
export function ChatUsageBadge({ chatId }: ChatUsageBadgeProps) {
  const { usage, hasPlugins } = useChatUsage(chatId);

  if (!hasPlugins || usage.requestCount === 0) return null;

  const contextTokens = usage.lastContextTokens;
  const level = getContextLevel(contextTokens);
  const style = LEVEL_STYLES[level];

  const tooltip = [
    `Контекст: ${contextTokens.toLocaleString()} токенов`,
    `Всего обработано: ${usage.totalTokens.toLocaleString()} токенов`,
    `Запросов: ${usage.requestCount}`,
    usage.totalCost > 0 ? `Стоимость: $${usage.totalCost.toFixed(4)}` : null,
    level === "warn" ? "⚠ Контекст >100K — запросы дорожают" : null,
    level === "critical" ? "🔴 Контекст >200K — рекомендуется начать новый чат" : null,
  ].filter(Boolean).join("\n");

  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors ${style}`}
      title={tooltip}
    >
      {level !== "ok" && <AlertTriangle className="h-3 w-3" />}
      {level === "ok" && <Coins className="h-3 w-3" />}
      {contextTokens > 0 ? formatTokens(contextTokens) : formatTokens(usage.totalTokens)}
      {usage.totalCost > 0 && (
        <span className="opacity-70">
          · ${usage.totalCost.toFixed(4)}
        </span>
      )}
    </span>
  );
}
