"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatItemMenuProps {
  anchor: HTMLElement;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const MENU_WIDTH = 160;
const GAP = 4;

// ─── Component ───────────────────────────────────────────────────────

/**
 * Chat row actions rendered into `document.body`.
 * The sidebar list is a scroll container, so an in-flow popup would be
 * clipped by it — the portal escapes that and flips above the anchor
 * when the viewport bottom is too close.
 */
export function ChatItemMenu({ anchor, onClose, onRename, onDelete }: ChatItemMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Positioned imperatively so the first paint is already in place
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = anchor.getBoundingClientRect();
    const below = rect.bottom + GAP;
    const top = below + el.offsetHeight > window.innerHeight ? rect.top - el.offsetHeight - GAP : below;
    const left = Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8);
    el.style.top = `${Math.max(8, top)}px`;
    el.style.left = `${Math.max(8, left)}px`;
    el.style.visibility = "visible";
  }, [anchor]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", onClose);
    // Capture phase — the anchor moves with the sidebar list, not the window
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ width: MENU_WIDTH, visibility: "hidden" }}
      className="fixed left-0 top-0 z-50 overflow-hidden rounded-[10px] border border-th-border bg-th-panel shadow-xl shadow-th-shadow"
    >
      <button
        onClick={onRename}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-th-fg hover:bg-th-subtle"
      >
        <Pencil className="h-4 w-4" />
        Переименовать
      </button>
      <button
        onClick={onDelete}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-th-red hover:bg-th-red/10"
      >
        <Trash2 className="h-4 w-4" />
        Удалить
      </button>
    </div>,
    document.body
  );
}
