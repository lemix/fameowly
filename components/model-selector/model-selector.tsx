"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, AlertTriangle, Shield, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption, UserInfo } from "@/lib/types";
import { TIER_LABELS, TIER_ORDER, TIER_ICONS } from "@/lib/models";
import { ModelList, type ModelTab, type TierGroup } from "./model-list";
import { ModelTabs } from "./model-tabs";
import { ModelBanner } from "./model-banner";

interface ModelSelectorProps {
  models: ModelOption[];
  selected: ModelOption;
  onChange: (model: ModelOption) => void;
  user: UserInfo | null;
  modelUnavailable?: boolean;
}

function isFamilyUser(user: UserInfo | null): boolean {
  if (!user) return true;
  return user.role === "admin" || user.role === "family" || user.role === "user";
}

const CLOSE_DELAY = 220;
const EXIT_MS = 180;
/** Hard cap for the scrollable area (≈7 items + headers). Content shorter than this auto-shrinks. */
const SCROLL_MAX_H = 420;

export function ModelSelector({ models, selected, onChange, user, modelUnavailable }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pick, setPick] = useState(selected.id);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchY = useRef(0);
  const locked = useRef(false);

  const hasWorld = useMemo(() => models.some((m) => !m.isLocal), [models]);
  const hasLocal = useMemo(() => models.some((m) => !!m.isLocal), [models]);
  const showTabs = hasWorld && hasLocal;
  const [activeTab, setActiveTab] = useState<ModelTab>(selected.isLocal ? "local" : "world");

  useEffect(() => { if (open) setActiveTab(selected.isLocal ? "local" : "world"); }, [open, selected.isLocal]);

  const filteredModels = useMemo(() => {
    if (!showTabs) return models;
    return models.filter((m) => (activeTab === "local" ? !!m.isLocal : !m.isLocal));
  }, [models, activeTab, showTabs]);

  const groups = useMemo<TierGroup[]>(
    () => TIER_ORDER
      .map((t) => ({ tier: t, label: TIER_LABELS[t], icon: TIER_ICONS[t], models: filteredModels.filter((m) => m.tier === t) }))
      .filter((g) => g.models.length > 0),
    [filteredModels],
  );

  useEffect(() => { setPick(selected.id); }, [selected.id]);
  // Check if the selected model belongs to the currently visible tab
  const selectedInTab = useMemo(() => {
    if (!showTabs) return true;
    return activeTab === "local" ? !!selected.isLocal : !selected.isLocal;
  }, [showTabs, activeTab, selected.isLocal]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = 0;
    el.style.maxHeight = "";
    // Double-rAF waits for React render + browser paint so new list DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!el) return;
        // Desktop: snap scroll area height to show only complete model items
        if (!isMobile) {
          const items = el.querySelectorAll('[data-testid^="model-option-"]');
          let lastBottom = 0;
          for (const item of items) {
            const htmlEl = item as HTMLElement;
            const bottom = htmlEl.offsetTop + htmlEl.offsetHeight;
            if (bottom <= SCROLL_MAX_H) lastBottom = bottom;
            else break;
          }
          if (lastBottom > 0) el.style.maxHeight = `${lastBottom}px`;
        }
        // Smart-scroll to selected model (both desktop & mobile)
        if (!selectedInTab) return;
        const active = el.querySelector('[data-active]') as HTMLElement | null;
        if (!active) return;
        const itemBottom = active.offsetTop + active.offsetHeight;
        if (itemBottom <= el.clientHeight) return;
        // Bottom-align: selected model's bottom edge = container's bottom edge
        el.scrollTop = itemBottom - el.clientHeight;
      });
    });
  }, [open, activeTab, selectedInTab, isMobile]);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const close = useCallback(() => {
    if (locked.current) return;
    locked.current = true; setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); locked.current = false; }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile, close]);

  const family = isFamilyUser(user);
  const handleSelect = useCallback((m: ModelOption) => { setPick(m.id); onChange(m); setTimeout(close, CLOSE_DELAY); }, [onChange, close]);

  const tabsUI = showTabs && <ModelTabs activeTab={activeTab} onTabChange={setActiveTab} />;
  const bannerUI = <ModelBanner activeTab={showTabs ? activeTab : null} />;
  const listContent = <ModelList groups={groups} pick={pick} user={user} family={family} onSelect={handleSelect} />;

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => { if (locked.current) return; open ? close() : setOpen(true); }}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition min-h-[40px] w-[200px] max-w-full outline-none",
          modelUnavailable ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/20" : "bg-slate-800/50 border border-white/5 text-slate-200 hover:bg-slate-800 hover:text-white shadow-sm cursor-pointer",
        )}
        data-testid="model-selector-trigger"
      >
        {modelUnavailable ? (
          <><AlertTriangle className="h-4 w-4 shrink-0" /><span className="truncate font-medium">Модель недоступна</span></>
        ) : (
          <>
            {selected.isLocal ? <Shield className="h-4 w-4 shrink-0 text-emerald-500" /> : <Sparkles className="h-4 w-4 shrink-0 text-slate-400" />}
            <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">{selected.name}</span>
          </>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform ml-auto", open && "rotate-180")} />
      </button>

      {open && !isMobile && (
        <div
          className={cn("absolute left-0 top-full z-50 mt-2 pt-2 pb-2 w-[24rem] rounded-2xl border border-slate-700/50 bg-slate-800/95 shadow-2xl backdrop-blur-sm overflow-hidden", closing ? "animate-popover-out" : "animate-popover-in")}
          data-testid="model-popover"
        >
          {tabsUI}
          {bannerUI}
          <div ref={scrollRef} className="overflow-y-auto snap-y snap-proximity" style={{ maxHeight: SCROLL_MAX_H }}>
            {listContent}
          </div>
        </div>
      )}

      {open && isMobile && (
        <>
          <div className={cn("fixed inset-0 z-40 bg-black/50", closing ? "animate-fade-out" : "modal-overlay")} onClick={close} data-testid="model-sheet-overlay" />
          <div
            className={cn("fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[70dvh] rounded-t-2xl bg-slate-800 shadow-2xl", closing ? "animate-sheet-out" : "modal-content-mobile")}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => { if (e.changedTouches[0].clientY - touchY.current > 80) close(); }}
            data-testid="model-bottom-sheet"
          >
            <div className="shrink-0">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-slate-600" /></div>
              <div className="flex items-center justify-between px-4 pb-2">
                <h3 className="text-sm font-semibold text-white">Выбор модели</h3>
                <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="shrink-0">
              {tabsUI}
              {bannerUI}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">{listContent}</div>
          </div>
        </>
      )}
    </div>
  );
}
