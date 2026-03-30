"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption } from "@/lib/types";
import { PROVIDER_LABELS, PROVIDER_ORDER, PROVIDER_COLORS } from "@/lib/models";

// ─── Types ───────────────────────────────────────────────────────────

interface ModelDropdownProps {
  models: ModelOption[];
  selected: ModelOption;
  onChange: (m: ModelOption) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function ModelDropdown({ models, selected, onChange }: ModelDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Group models by provider in defined order
  const groups = PROVIDER_ORDER
    .map((provider) => ({
      provider,
      label: PROVIDER_LABELS[provider],
      color: PROVIDER_COLORS[provider],
      models: models.filter((m) => m.provider === provider),
    }))
    .filter((g) => g.models.length > 0);

  // Track which accordion sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    initial.add("google");
    return initial;
  });

  // When selected model changes, ensure its section is expanded
  useEffect(() => {
    setExpandedSections((prev) => {
      if (prev.has(selected.provider)) return prev;
      const next = new Set(prev);
      next.add(selected.provider);
      return next;
    });
  }, [selected.provider]);

  function toggleSection(provider: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2.5 text-sm text-white transition hover:border-slate-500"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("h-2 w-2 shrink-0 rounded-full", PROVIDER_COLORS[selected.provider])} />
          <span className="truncate">{selected.name}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
          {groups.map((group) => {
            const isExpanded = expandedSections.has(group.provider);
            return (
              <div key={group.provider}>
                <button
                  onClick={() => toggleSection(group.provider)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:bg-slate-700/30 hover:text-slate-400"
                >
                  <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", group.color)} />
                  <span>{group.label}</span>
                  <span className="text-slate-600">({group.models.length})</span>
                  <ChevronDown className={cn("ml-auto h-3 w-3 text-slate-600 transition-transform", isExpanded && "rotate-180")} />
                </button>

                {isExpanded && (
                  <div>
                    {group.models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { onChange(m); setOpen(false); }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 pl-6 text-sm transition",
                          selected.id === m.id
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-slate-300 hover:bg-slate-700/50"
                        )}
                      >
                        <div className={cn("h-2 w-2 shrink-0 rounded-full", PROVIDER_COLORS[m.provider])} />
                        <span className="truncate">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
