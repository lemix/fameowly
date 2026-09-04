"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UsagePeriodSummary } from "@/lib/usage-periods";
import { formatMonthKey } from "./usage-format";

interface UsageMonthNavProps {
  months: UsagePeriodSummary[];
  activeMonth: string | null;
  onChange: (monthKey: string) => void;
}

/** Month pager — steps only through months that contain records */
export function UsageMonthNav({ months, activeMonth, onChange }: UsageMonthNavProps) {
  if (months.length === 0 || !activeMonth) return null;

  const index = months.findIndex((m) => m.key === activeMonth);
  // months are sorted newest first, so "next" is the lower index
  const olderMonth = months[index + 1];
  const newerMonth = index > 0 ? months[index - 1] : undefined;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => olderMonth && onChange(olderMonth.key)}
        disabled={!olderMonth}
        aria-label="Предыдущий месяц"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-th-border transition hover:bg-th-subtle disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <select
        value={activeMonth}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Месяц"
        className="min-w-[170px] rounded-lg border border-th-border bg-th-input px-3 py-1.5 text-center text-sm font-medium outline-none focus:border-blue-500"
      >
        {months.map((m) => (
          <option key={m.key} value={m.key}>
            {formatMonthKey(m.key)}
          </option>
        ))}
      </select>

      <button
        onClick={() => newerMonth && onChange(newerMonth.key)}
        disabled={!newerMonth}
        aria-label="Следующий месяц"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-th-border transition hover:bg-th-subtle disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
