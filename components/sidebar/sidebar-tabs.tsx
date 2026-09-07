"use client";

import { MessageSquare, ImageIcon, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/types";

// ─── Constants ───────────────────────────────────────────────────────

const TABS = [
  { mode: "chat" as const, icon: MessageSquare, label: "Чат" },
  { mode: "image" as const, icon: ImageIcon, label: "Картинки" },
  { mode: "video" as const, icon: Film, label: "Видео" },
];

// ─── Types ───────────────────────────────────────────────────────────

interface SidebarTabsProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────

/** Icon-only mode switcher: chat / images / video */
export function SidebarTabs({ mode, onModeChange, className }: SidebarTabsProps) {
  return (
    <div className={cn("flex shrink-0 gap-3 pl-[23px] pr-5 pt-[26px]", className)}>
      {TABS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          onClick={() => onModeChange(m)}
          title={label}
          aria-label={label}
          aria-pressed={mode === m}
          data-testid={`mode-tab-${m}`}
          className={cn(
            "flex h-[40px] w-[72px] items-center justify-center rounded-[10px] border transition",
            mode === m
              ? "border-transparent bg-th-accent-bg text-th-accent"
              : "border-th-border bg-th-tab text-th-fg-m hover:text-th-fg"
          )}
        >
          <Icon className="h-[30px] w-[30px]" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
