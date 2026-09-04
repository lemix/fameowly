"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Lightweight tooltip: opens on hover/focus on desktop and on tap on touch
 * devices. Closes on Escape or on an outside click.
 */
export function Tooltip({ content, children, className = "" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex cursor-default items-center"
      >
        {children}
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-max max-w-[min(18rem,80vw)] -translate-x-1/2 rounded-lg border border-th-border bg-th-panel px-3 py-2 text-left text-xs font-normal text-th-fg shadow-xl"
        >
          {content}
        </span>
      )}
    </span>
  );
}
