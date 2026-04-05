"use client";

import { useState, useRef, useEffect } from "react";
import {
  Trash2,
  Pencil,
  Check,
  X,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";

// ─── Types ───────────────────────────────────────────────────────────

interface ChatItemProps {
  chat: ChatListItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function ChatItem({ chat, isActive, onSelect, onDelete, onRename }: ChatItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSave() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== chat.title) {
      onRename(trimmed);
    } else {
      setTitle(chat.title);
    }
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "group relative flex items-start rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer",
        isActive
          ? "bg-blue-600/10 text-blue-300 ring-1 ring-blue-500/20"
          : "text-slate-300 hover:bg-white/[0.04]"
      )}
      onClick={() => !editing && onSelect()}
    >

      {editing ? (
        <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setTitle(chat.title); setEditing(false); }
            }}
            className="flex-1 rounded bg-slate-700 px-2 py-0.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={handleSave} className="rounded p-0.5 text-green-400 hover:bg-slate-600">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setTitle(chat.title); setEditing(false); }}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 line-clamp-2 leading-snug">{chat.title}</span>

          {/* Context menu */}
          <div ref={menuRef} className="relative mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "rounded-lg p-2 -mr-1 text-slate-500 transition-all",
                menuOpen
                  ? "bg-slate-700 text-slate-300"
                  : "opacity-40 md:opacity-0 md:group-hover:opacity-60 hover:!opacity-100 hover:bg-slate-700 hover:text-slate-300"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                <button
                  onClick={() => { setMenuOpen(false); setEditing(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Переименовать
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={confirmDelete}
        title="Удалить чат?"
        message={`Чат «${chat.title}» будет удалён без возможности восстановления.`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
