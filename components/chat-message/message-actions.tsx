"use client";

import { useState } from "react";
import { Copy, Check, Trash2, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface MessageActionsProps {
  role: "user" | "assistant";
  content: string;
  messageId: string;
  onDelete?: (messageId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function MessageActions({ role, content, messageId, onDelete }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isUser = role === "user";

  return (
    <div className="flex items-center gap-1">
      {/* Copy button — assistant only */}
      {!isUser && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition"
          title="Копировать Markdown"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Копировать</span>
            </>
          )}
        </button>
      )}

      {/* Delete button + inline confirm */}
      {onDelete && !confirmDelete && (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 group-hover/msg:opacity-100 hover:text-red-400 hover:bg-slate-700/50 transition"
          title="Удалить сообщение"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      {onDelete && confirmDelete && (
        <div className="flex items-center gap-1 ml-1 rounded-md bg-slate-700/50 px-2 py-1">
          <span className="text-xs text-red-400">Удалить?</span>
          <button
            onClick={() => { onDelete(messageId); setConfirmDelete(false); }}
            className="rounded p-0.5 text-red-400 hover:bg-red-500/20 transition"
            title="Подтвердить удаление"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-600 transition"
            title="Отмена"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
