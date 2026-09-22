"use client";

import type { ChatSession } from "@/lib/types";
import { useLocalDateTime } from "@/hooks/use-local-datetime";
import { PrintMessage } from "./print-message";

interface PrintDocumentProps {
  chat: ChatSession;
  modelName: string;
  exportedAt: string;
}

// ─── Component ───────────────────────────────────────────────────────

/** Full chat transcript laid out as a printable document. */
export function PrintDocument({ chat, modelName, exportedAt }: PrintDocumentProps) {
  const created = useLocalDateTime(chat.createdAt);
  const exported = useLocalDateTime(exportedAt);
  const systemPrompt = chat.systemPrompt?.trim();

  return (
    <div className="print-root mx-auto max-w-[820px] bg-th-page px-6 py-8 text-th-fg-s">
      <header className="mb-6 border-b border-th-border pb-4">
        <h1 className="text-xl font-semibold text-th-fg">{chat.title}</h1>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-th-fg-m">
          <div className="flex gap-1">
            <dt>Модель:</dt>
            <dd className="text-th-fg-s">{modelName}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Создан:</dt>
            <dd className="text-th-fg-s">{created}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Выгружен:</dt>
            <dd className="text-th-fg-s">{exported}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Сообщений:</dt>
            <dd className="text-th-fg-s">{chat.messages.length}</dd>
          </div>
        </dl>

        {systemPrompt && (
          <div className="mt-3 rounded-lg border border-th-border bg-th-subtle px-3 py-2">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-th-fg-m">
              Системный промпт
            </h2>
            <p className="whitespace-pre-wrap text-xs text-th-fg-s">{systemPrompt}</p>
          </div>
        )}
      </header>

      {chat.messages.length === 0 ? (
        <p className="text-sm text-th-fg-f">В этом чате пока нет сообщений.</p>
      ) : (
        <div className="space-y-6">
          {chat.messages.map((message) => (
            <PrintMessage key={message.id} message={message} />
          ))}
        </div>
      )}

      <footer className="print-hidden mt-10 border-t border-th-border pt-4 text-xs text-th-fg-f">
        Нажмите Ctrl/Cmd + P и выберите «Сохранить как PDF», если диалог печати не открылся автоматически.
      </footer>
    </div>
  );
}
