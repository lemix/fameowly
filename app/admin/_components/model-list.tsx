"use client";

import { Pencil, Trash2, GripVertical } from "lucide-react";
import type { VirtualProvider } from "@/lib/types";

type ModelTier = "basic" | "advanced" | "ultra";
type BaseProvider = "google" | "openrouter" | "local";

interface ModelOption {
  id: string;
  name: string;
  provider: BaseProvider;
  tier: ModelTier;
  clientPrice?: number;
  description?: string;
  virtualProviderId?: string;
}

const TIER_LABELS: Record<ModelTier, string> = {
  basic: "Базовые",
  advanced: "Продвинутые",
  ultra: "Ультра",
};

const PROVIDER_LABELS: Record<BaseProvider, string> = {
  google: "Google",
  openrouter: "OpenRouter",
  local: "Локальный",
};

export function ModelList({
  models,
  providers,
  onEdit,
  onDelete,
}: {
  models: ModelOption[];
  providers: VirtualProvider[];
  onEdit: (m: ModelOption, i: number) => void;
  onDelete: (i: number) => void;
}) {
  function providerLabel(m: ModelOption): string {
    if (m.virtualProviderId) {
      const vp = providers.find((p) => p.id === m.virtualProviderId);
      return vp ? vp.name : m.virtualProviderId;
    }
    return PROVIDER_LABELS[m.provider] ?? m.provider;
  }

  if (models.length === 0) {
    return <p className="text-sm text-slate-400">Нет моделей. Добавьте первую!</p>;
  }

  return (
    <div className="space-y-2">
      {models.map((m, i) => (
        <div
          key={m.id + i}
          className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-600" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{m.name}</span>
                <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {TIER_LABELS[m.tier]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="truncate font-mono">{m.id}</span>
                <span>·</span>
                <span className="shrink-0">{providerLabel(m)}</span>
                {m.clientPrice != null && (
                  <>
                    <span>·</span>
                    <span className="shrink-0">{m.clientPrice} ₮</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => onEdit(m, i)}
              className="rounded p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(i)}
              className="rounded p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
