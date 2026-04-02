"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, AlertTriangle, Shield, X, Sparkles, Check, Coins, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption, ModelTier, UserInfo } from "@/lib/types";
import { TIER_LABELS, TIER_ORDER, TIER_ICONS, PROVIDER_COLORS } from "@/lib/models";

interface ModelSelectorProps {
  models: ModelOption[];
  selected: ModelOption;
  onChange: (model: ModelOption) => void;
  user: UserInfo | null;
  modelUnavailable?: boolean;
}
interface TierGroup { tier: ModelTier; label: string; icon: string; models: ModelOption[] }

function isFamilyUser(user: UserInfo | null): boolean {
  if (!user) return true;
  return user.role === "admin" || user.role === "family" || user.role === "user";
}

const CLOSE_DELAY = 220;
const EXIT_MS = 180;
export function ModelSelector({ models, selected, onChange, user, modelUnavailable }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pick, setPick] = useState(selected.id);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const touchY = useRef(0);
  const locked = useRef(false);

  useEffect(() => { setPick(selected.id); }, [selected.id]);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const close = useCallback(() => {
    if (locked.current) return;
    locked.current = true;
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); locked.current = false; }, EXIT_MS);
  }, []);
  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile, close]);
  const groups = TIER_ORDER
    .map((tier) => ({ tier, label: TIER_LABELS[tier], icon: TIER_ICONS[tier], models: models.filter((m) => m.tier === tier) }))
    .filter((g) => g.models.length > 0);
  const family = isFamilyUser(user);
  const handleSelect = useCallback((m: ModelOption) => {
    setPick(m.id);
    onChange(m);
    setTimeout(close, CLOSE_DELAY);
  }, [onChange, close]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => { if (locked.current) return; open ? close() : setOpen(true); }}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition min-h-[44px]",
          modelUnavailable
            ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/20"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
        data-testid="model-selector-trigger"
      >
        {modelUnavailable ? (
          <><AlertTriangle className="h-4 w-4" /><span>Модель недоступна</span></>
        ) : (
          <><div className={cn("h-2 w-2 shrink-0 rounded-full", PROVIDER_COLORS[selected.provider])} /><span className="max-w-[200px] truncate">{selected.name}</span></>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && !isMobile && (
        <div
          className={cn("absolute left-0 top-full z-50 mt-2 w-[22rem] rounded-xl border border-slate-700/50 bg-slate-800 shadow-lg",
            closing ? "animate-popover-out" : "animate-popover-in")}
          data-testid="model-popover"
        >
          <ModelList groups={groups} pick={pick} user={user} family={family} onSelect={handleSelect} />
        </div>
      )}

      {open && isMobile && (
        <>
          <div
            className={cn("fixed inset-0 z-40 bg-black/50", closing ? "animate-fade-out" : "modal-overlay")}
            onClick={close} data-testid="model-sheet-overlay"
          />
          <div
            className={cn("fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] rounded-t-2xl bg-slate-800 shadow-2xl",
              closing ? "animate-sheet-out" : "modal-content-mobile")}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => { if (e.changedTouches[0].clientY - touchY.current > 80) close(); }}
            data-testid="model-bottom-sheet"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-600" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-sm font-semibold text-white">Выбор модели</h3>
              <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(70dvh - 72px)" }}>
              <ModelList groups={groups} pick={pick} user={user} family={family} onSelect={handleSelect} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ModelListProps {
  groups: TierGroup[]; pick: string; user: UserInfo | null; family: boolean;
  onSelect: (model: ModelOption) => void;
}

function ModelList({ groups, pick, user, family, onSelect }: ModelListProps) {
  return (
    <div className="py-2 px-2" data-testid="model-list">
      {groups.map((group, gi) => (
        <div key={group.tier}>
          <div className={cn(
            "px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500",
            gi > 0 && "mt-4 border-t border-slate-700/40 pt-4"
          )}>
            {group.icon} {group.label}
          </div>
          {group.models.map((model) => {
            const isActive = pick === model.id;
            const showLocal = model.isLocal && family;
            return (
              <button
                key={model.id}
                onClick={() => onSelect(model)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3.5 text-left rounded-lg min-h-[3rem]",
                  "transition-all duration-150 active:scale-[0.97]",
                  showLocal && "border-l-2 border-emerald-500",
                  isActive ? "bg-white/10" : "hover:bg-white/5",
                )}
                data-testid={`model-option-${model.id}`}
              >
                {showLocal
                  ? <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
                  : <Sparkles className="h-4 w-4 shrink-0 text-slate-400" />}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[0.8125rem] font-semibold text-slate-100 truncate">{model.name}</span>
                  {showLocal && (
                    <span className="text-[10px] text-emerald-500/70 leading-tight truncate">
                      Приватная модель. Данные не покидают дом.
                    </span>
                  )}
                </div>
                <PriceBadge model={model} user={user} family={family} />
                {isActive && <Check className="h-4 w-4 shrink-0 text-white" data-testid="model-check-icon" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PriceBadge({ model, user, family }: { model: ModelOption; user: UserInfo | null; family: boolean }) {
  if (!user) return null;
  const cfg = family && model.isLocal
    ? { icon: Gift, text: "Бесплатно", color: "text-emerald-500", tid: "badge-free" }
    : user.role === "client"
      ? { icon: Coins, text: `${model.clientPrice} 🪙`, color: "text-amber-400", tid: "badge-price" }
      : family && model.tier === "ultra"
        ? { icon: Coins, text: "Дорого", color: "text-orange-500", tid: "badge-expensive" }
        : null;
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn("flex items-center gap-1 shrink-0", cfg.color)} data-testid={cfg.tid}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs hidden sm:inline">{cfg.text}</span>
    </span>
  );
}
