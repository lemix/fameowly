"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface ModelBottomSheetProps {
  closing: boolean;
  onClose: () => void;
  /** Shared with the parent, which measures and auto-scrolls the list. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Tabs + banner — pinned above the scrollable list. */
  top: ReactNode;
  children: ReactNode;
}

/** Swipe-down distance that dismisses the sheet */
const DRAG_CLOSE_PX = 80;

// ─── Component ───────────────────────────────────────────────────────

/**
 * Rendered into `document.body`: the app header carries `backdrop-filter`,
 * which makes it a containing block for `position: fixed` descendants, so an
 * in-place sheet would anchor to the 71px header instead of the viewport.
 */
export function ModelBottomSheet({ closing, onClose, scrollRef, top, children }: ModelBottomSheetProps) {
  const touchY = useRef(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <>
      <div
        className={cn("fixed inset-0 z-[90] bg-black/50", closing ? "animate-fade-out" : "modal-overlay")}
        onClick={onClose}
        data-testid="model-sheet-overlay"
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[95] flex flex-col max-h-[70dvh] rounded-t-2xl bg-th-panel shadow-2xl",
          closing ? "animate-sheet-out" : "modal-content-mobile",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onTouchStart={(e) => {
          touchY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          // Prevent sheet drag when list is scrollable and not at top
          if (scrollRef.current && scrollRef.current.scrollTop > 0) {
            touchY.current = e.touches[0].clientY;
          }
        }}
        onTouchEnd={(e) => {
          const dy = e.changedTouches[0].clientY - touchY.current;
          const atTop = !scrollRef.current || scrollRef.current.scrollTop <= 0;
          if (atTop && dy > DRAG_CLOSE_PX) onClose();
        }}
        data-testid="model-bottom-sheet"
      >
        <div className="shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-th-muted" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-sm font-semibold text-th-fg">Выбор модели</h3>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="flex h-8 w-8 items-center justify-center rounded-full text-th-fg-m hover:bg-th-subtle"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="shrink-0">{top}</div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
