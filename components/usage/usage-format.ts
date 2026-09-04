import type { UsageRecord } from "@/lib/types";
import type { UsageMonthView, UsagePeriodSummary } from "@/lib/usage-periods";

export interface UsageApiResponse {
  months: UsagePeriodSummary[];
  view: UsageMonthView | null;
}

const RU_MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

/** "2026-09" → "Сентябрь 2026" */
export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-");
  return `${RU_MONTHS[Number(month) - 1] ?? key} ${year}`;
}

/** "2026-09-01" → "01.09" */
export function formatDayShort(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

export function formatRange(from: string, to: string): string {
  return from === to
    ? formatDayShort(from)
    : `${formatDayShort(from)} — ${formatDayShort(to)}`;
}

export function formatRecordDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTokens(n: number): string {
  return n > 0 ? n.toLocaleString("ru-RU") : "—";
}

export type { UsageRecord, UsageMonthView, UsagePeriodSummary };
