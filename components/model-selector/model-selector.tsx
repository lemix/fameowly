"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption } from "@/lib/types";
import { MOBILE_BREAKPOINT } from "@/lib/constants/breakpoints";
import { TIER_LABELS, TIER_ORDER, TIER_ICONS } from "@/lib/models";
import { ModelList, type ModelTab, type TierGroup } from "./model-list";
import { ModelTabs } from "./model-tabs";
import { ModelBanner } from "./model-banner";
import { ModelBottomSheet } from "./model-bottom-sheet";

interface ModelSelectorProps {
  models: ModelOption[];
  selected: ModelOption;
  onChange: (model: ModelOption) => void;
  modelUnavailable?: boolean;
}

const CLOSE_DELAY = 220;
const EXIT_MS = 180;
/** Hard cap for the scrollable area (≈7 items + headers). Content shorter than this auto-shrinks. */
const SCROLL_MAX_H = 420;

export function ModelSelector({ models, selected, onChange, modelUnavailable }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pick, setPick] = useState(selected.id);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
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

  const handleSelect = useCallback((m: ModelOption) => { setPick(m.id); onChange(m); setTimeout(close, CLOSE_DELAY); }, [onChange, close]);

  const tabsUI = showTabs && <ModelTabs activeTab={activeTab} onTabChange={setActiveTab} />;
  const bannerUI = <ModelBanner activeTab={showTabs ? activeTab : null} />;
  const listContent = <ModelList groups={groups} pick={pick} onSelect={handleSelect} />;

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => { if (locked.current) return; open ? close() : setOpen(true); }}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-lg text-[16px] leading-none outline-none transition",
          modelUnavailable ? "text-th-red hover:opacity-80" : "text-th-fg hover:text-th-accent cursor-pointer",
        )}
        data-testid="model-selector-trigger"
      >
        {modelUnavailable ? (
          <><AlertTriangle className="h-4 w-4 shrink-0" /><span className="truncate">Модель недоступна</span></>
        ) : (
          <>
            {selected.isLocal && <Shield className="h-4 w-4 shrink-0 text-emerald-500" />}
            <span className="truncate max-w-[140px] sm:max-w-[240px]">{selected.name}</span>
          </>
        )}
        <svg
          viewBox="0 0 14 7"
          aria-hidden
          className={cn("h-[7px] w-[14px] shrink-0 fill-current transition-transform", open && "rotate-180")}
        >
          <path d="M7 6.6 0 0h14z" />
        </svg>
      </button>

      {open && !isMobile && (
        <div
          className={cn("absolute left-0 top-full z-50 mt-2 pt-2 pb-2 w-[24rem] rounded-2xl border border-th-border/50 bg-th-panel/95 shadow-2xl backdrop-blur-sm overflow-hidden", closing ? "animate-popover-out" : "animate-popover-in")}
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
        <ModelBottomSheet
          closing={closing}
          onClose={close}
          scrollRef={scrollRef}
          top={<>{tabsUI}{bannerUI}</>}
        >
          {listContent}
        </ModelBottomSheet>
      )}
    </div>
  );
}
