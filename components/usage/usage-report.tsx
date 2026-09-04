"use client";

import { formatCost } from "@/lib/pricing";
import { useUsageReport } from "@/hooks/use-usage-report";
import { UsageMonthNav } from "./usage-month-nav";
import { UsageTable } from "./usage-table";

interface UsageReportProps {
  /** Admin-only: whose data to show. Omit for the current user. */
  userId?: string;
}

/** Month navigation + totals + segmented table. Shared by /usage and admin. */
export function UsageReport({ userId }: UsageReportProps) {
  const { months, view, activeMonth, setMonth, loading } = useUsageReport(userId);

  const grandTotalRequests = months.reduce((sum, m) => sum + m.requestCount, 0);
  const grandTotalCost = months.reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="rounded-xl border border-th-border bg-th-panel/80 px-5 py-3">
            <div className="text-xs text-th-fg-m">Всего запросов</div>
            <div className="text-2xl font-bold">{grandTotalRequests}</div>
          </div>
          <div className="rounded-xl border border-th-border bg-th-panel/80 px-5 py-3">
            <div className="text-xs text-th-fg-m">Всего потрачено</div>
            <div className="text-2xl font-bold">{formatCost(grandTotalCost)}</div>
          </div>
        </div>

        <UsageMonthNav months={months} activeMonth={activeMonth} onChange={setMonth} />
      </div>

      <UsageTable view={view} loading={loading} />
    </div>
  );
}
