"use client";

import { useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";

// ─── Types ───────────────────────────────────────────────────────────

interface MessageActionsProps {
  role: "user" | "assistant";
  content: string;
  messageId: string;
  onDelete?: (messageId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────

const actionCls =
  "flex h-6 w-6 items-center justify-center text-th-fg-m transition hover:text-th-fg";

// ─── Component ───────────────────────────────────────────────────────

export function MessageActions({ role, content, messageId, onDelete }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-[10px]">
      <button
        onClick={handleCopy}
        className={actionCls}
        title={copied ? "Скопировано" : "Копировать"}
        aria-label="Копировать"
      >
        {copied
          ? <Check className="h-6 w-6 text-th-green" strokeWidth={1.5} />
          : <Copy className="h-6 w-6" strokeWidth={1.5} />}
      </button>

      {onDelete && (
        <button
          onClick={() => setConfirmDelete(true)}
          className={`${actionCls} hover:text-th-red`}
          title="Удалить сообщение"
          aria-label="Удалить сообщение"
        >
          <Trash2 className="h-6 w-6" strokeWidth={1.5} />
        </button>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Удалить сообщение?"
        message={`Сообщение ${role === "user" ? "пользователя" : "ассистента"} будет удалено без возможности восстановления.`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => { setConfirmDelete(false); onDelete?.(messageId); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
