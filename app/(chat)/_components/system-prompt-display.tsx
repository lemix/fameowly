"use client";

import { useState } from "react";
import { Brain, Check, Pencil } from "lucide-react";

interface SystemPromptDisplayProps {
  systemPrompt: string;
  onSave: (newPrompt: string) => void;
}

/** Editable system prompt display (view mode / edit mode) */
export function SystemPromptDisplay({ systemPrompt, onSave }: SystemPromptDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [editingText, setEditingText] = useState("");

  if (editing) {
    return (
      <div className="mb-4">
        <div className="rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-400">
            <Brain className="h-3.5 w-3.5" />
            Системный промпт
          </div>
          <textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                onSave(editingText);
                setEditing(false);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-purple-500"
            >
              <Check className="h-3 w-3" />
              Сохранить
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-600"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => {
          setEditingText(systemPrompt);
          setEditing(true);
        }}
        className="group w-full rounded-xl border-2 border-dashed border-slate-700/50 bg-slate-800/30 p-3 text-left transition hover:border-purple-500/30 hover:bg-purple-500/5"
      >
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <Brain className="h-3 w-3" />
          <span className="font-medium">Системный промпт</span>
          <Pencil className="ml-auto h-3 w-3 opacity-0 transition group-hover:opacity-100" />
        </div>
        <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
          {systemPrompt}
        </p>
      </button>
    </div>
  );
}
