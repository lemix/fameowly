"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";
import { ChatItemMenu } from "./chat-item-menu";

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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

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
        "group relative z-0 flex cursor-pointer items-start rounded-[10px] p-[10px] text-sm transition-colors",
        isActive
          ? "bg-th-accent-bg text-th-fg"
          : "bg-th-sidebar text-th-fg hover:bg-th-subtle"
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
            className="min-w-0 flex-1 rounded bg-th-input px-2 py-0.5 text-sm text-th-fg outline-none focus:ring-1 focus:ring-th-accent"
          />
          <button onClick={handleSave} className="rounded p-0.5 text-th-green hover:bg-th-muted">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setTitle(chat.title); setEditing(false); }}
            className="rounded p-0.5 text-th-fg-m hover:bg-th-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="line-clamp-2 w-full leading-[1.4]">{chat.title}</span>

          {/* Action strip — inherits the row background so it masks the clamped title */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-y-px right-px flex items-stretch bg-inherit transition-opacity",
              menuAnchor || isActive
                ? "opacity-100"
                : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
            )}
          >
            <div className="w-6 bg-inherit [mask-image:linear-gradient(to_right,transparent,#000)]" />
            <div className="flex items-center rounded-r-[9px] bg-inherit pr-[6px]">
              <button
                onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
                aria-label="Действия с чатом"
                className={cn(
                  "rounded-lg p-1 transition",
                  menuAnchor ? "text-th-fg" : "text-th-fg-m hover:text-th-fg"
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          {menuAnchor && (
            <ChatItemMenu
              anchor={menuAnchor}
              onClose={() => setMenuAnchor(null)}
              onRename={() => { setMenuAnchor(null); setEditing(true); }}
              onDelete={() => { setMenuAnchor(null); setConfirmDelete(true); }}
            />
          )}
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
