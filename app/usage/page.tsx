"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { UsageReport } from "@/components/usage/usage-report";

export default function UsagePage() {
  const router = useRouter();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-th-page text-th-fg">
      <header className="flex items-center gap-4 border-b border-th-border px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-th-fg-s transition hover:bg-th-panel hover:text-th-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <h1 className="text-lg font-bold">
          <BarChart3 className="mr-2 inline h-5 w-5 text-th-accent" />
          Потребление
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          <UsageReport />
        </div>
      </div>
    </div>
  );
}
