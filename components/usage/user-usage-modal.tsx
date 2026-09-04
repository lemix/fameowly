"use client";

import { X } from "lucide-react";
import { UsageReport } from "./usage-report";

interface UserUsageModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

/** Admin view of a single user's consumption report */
export function UserUsageModal({ userId, userName, onClose }: UserUsageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-xl border border-th-border bg-th-page shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-th-border px-6 py-4">
          <h3 className="text-base font-semibold">
            Потребление — <span className="text-th-accent">{userName}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded p-2 text-th-fg-m transition hover:bg-th-subtle hover:text-th-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <UsageReport userId={userId} />
        </div>
      </div>
    </div>
  );
}
