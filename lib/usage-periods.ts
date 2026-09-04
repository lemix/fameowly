/**
 * Usage periods — groups usage records into calendar months and weeks.
 *
 * Periods without records are never produced, so the UI only paginates over
 * months that actually contain data. Weeks are clipped to the selected month,
 * which keeps the month total equal to the sum of its weeks.
 */

import type { UsageRecord } from "./types";

export interface UsagePeriodSummary {
  /** "YYYY-MM" for months, "YYYY-MM-DD" (Monday) for weeks */
  key: string;
  /** Inclusive range boundaries as "YYYY-MM-DD" */
  from: string;
  to: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
}

export interface UsageWeekGroup extends UsagePeriodSummary {
  records: UsageRecord[];
}

export interface UsageMonthView {
  month: UsagePeriodSummary;
  weeks: UsageWeekGroup[];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Monday of the week containing `d` */
function startOfWeek(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (start.getDay() + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0
  start.setDate(start.getDate() - shift);
  return start;
}

function emptySummary(key: string): UsagePeriodSummary {
  return { key, from: "", to: "", requestCount: 0, totalTokens: 0, totalCost: 0 };
}

function accumulate(summary: UsagePeriodSummary, record: UsageRecord, day: string): void {
  summary.requestCount += 1;
  summary.totalTokens += record.totalTokens;
  summary.totalCost += record.cost;
  if (!summary.from || day < summary.from) summary.from = day;
  if (!summary.to || day > summary.to) summary.to = day;
}

/** Months that contain at least one record, newest first */
export function listUsageMonths(records: UsageRecord[]): UsagePeriodSummary[] {
  const months = new Map<string, UsagePeriodSummary>();

  for (const record of records) {
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = toMonthKey(date);
    const summary = months.get(key) ?? emptySummary(key);
    accumulate(summary, record, toDayKey(date));
    months.set(key, summary);
  }

  return [...months.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** Records of one month, split into non-empty weeks (newest first) */
export function buildMonthView(
  records: UsageRecord[],
  monthKey: string,
): UsageMonthView {
  const month = emptySummary(monthKey);
  const weeks = new Map<string, UsageWeekGroup>();

  for (const record of records) {
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime()) || toMonthKey(date) !== monthKey) continue;

    const day = toDayKey(date);
    accumulate(month, record, day);

    const key = toDayKey(startOfWeek(date));
    const week = weeks.get(key) ?? { ...emptySummary(key), records: [] };
    accumulate(week, record, day);
    week.records.push(record);
    weeks.set(key, week);
  }

  const sorted = [...weeks.values()].sort((a, b) => b.key.localeCompare(a.key));
  for (const week of sorted) {
    week.records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return { month, weeks: sorted };
}
