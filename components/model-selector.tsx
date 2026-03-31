"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, AlertTriangle, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption, ModelTier, UserInfo } from "@/lib/types";
import { TIER_LABELS, TIER_ORDER, TIER_ICONS, PROVIDER_COLORS } from "@/lib/models";

// ─── Types ───────────────────────────────────────────────────────────

interface ModelSelectorProps {
  models: ModelOption[];
  selected: ModelOption;
  onChange: (model: ModelOption) => void;
  user: UserInfo | null;
  modelUnavailable?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getModelBadges(model: ModelOption, user: UserInfo | null) {
  const badges: Array<{ text: string; className: string }> = [];

  if (model.isLocal) {
    const isFamily = !user || user.role === "admin" || user.role === "family" || user.role === "user";
    badges.push({
      text: isFamily ? "🛡️ Наш сервер" : "🛡️ Приватная",
      className: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25",
    });
  }

  if (user) {
    const isFamily = user.role === "admin" || user.role === "family" || user.role === "user";
    if (isFamily) {
      if (model.isLocal) {
        badges.push({
          text: "Бесплатно",
          className: "bg-green-500/15 text-green-400 ring-1 ring-green-500/25",
        });
      } else if (model.tier === "ultra") {
        badges.push({
          text: "🔥 Дорого",
          className: "bg-red-500/15 text-red-400 ring-1 ring-red-500/25",
        });
      }
    } else if (user.role === "client") {
      badges.push({
        text: `${model.clientPrice} 🪙`,
        className: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25",
      });
    }
  }

  return badges;
}

// ─── Component ───────────────────────────────────────────────────────

export function ModelSelector({ models, selected, onChange, user, modelUnavailable }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close popover on outside click (desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile]);

  // Group models by tier
  const groups = TIER_ORDER
    .map((tier) => ({
      tier,
      label: TIER_LABELS[tier],
      icon: TIER_ICONS[tier],
      models: models.filter((m) => m.tier === tier),
    }))
    .filter((g) => g.models.length > 0);

  function handleSelect(model: ModelOption) {
    onChange(model);
    setOpen(false);
  }

  return (
    <div ref={popoverRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition min-h-[44px]",
          modelUnavailable
            ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/20"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
        data-testid="model-selector-trigger"
      >
        {modelUnavailable ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>Модель недоступна</span>
          </>
        ) : (
          <>
            <div className={cn("h-2 w-2 shrink-0 rounded-full", PROVIDER_COLORS[selected.provider])} />
            <span className="max-w-[200px] truncate">{selected.name}</span>
          </>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {/* Desktop Popover */}
      {open && !isMobile && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl"
          data-testid="model-popover"
        >
          <ModelList groups={groups} selected={selected} user={user} onSelect={handleSelect} />
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {open && isMobile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] rounded-t-2xl border-t border-slate-700 bg-slate-800 shadow-2xl modal-content-mobile"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            data-testid="model-bottom-sheet"
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
              <h3 className="text-sm font-semibold text-white">Выбор модели</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(70dvh - 56px)" }}>
              <ModelList groups={groups} selected={selected} user={user} onSelect={handleSelect} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ModelList (shared between popover and bottom sheet) ─────────────

interface TierGroup {
  tier: ModelTier;
  label: string;
  icon: string;
  models: ModelOption[];
}

interface ModelListProps {
  groups: TierGroup[];
  selected: ModelOption;
  user: UserInfo | null;
  onSelect: (model: ModelOption) => void;
}

function ModelList({ groups, selected, user, onSelect }: ModelListProps) {
  return (
    <div className="py-2">
      {groups.map((group) => (
        <div key={group.tier}>
          {/* Tier header */}
          <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {group.icon} {group.label}
          </div>
          {/* Models */}
          {group.models.map((model) => {
            const badges = getModelBadges(model, user);
            const isActive = selected.id === model.id;
            return (
              <button
                key={model.id}
                onClick={() => onSelect(model)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition min-h-[44px]",
                  isActive
                    ? "bg-blue-600/15 text-blue-300"
                    : model.isLocal
                      ? "text-slate-300 hover:bg-emerald-500/5 hover:border-l-2 hover:border-emerald-500/30"
                      : "text-slate-300 hover:bg-slate-700/50"
                )}
                data-testid={`model-option-${model.id}`}
              >
                <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", PROVIDER_COLORS[model.provider])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{model.name}</span>
                    {model.isLocal && <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {badges.map((badge, i) => (
                        <span key={i} className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", badge.className)}>
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
