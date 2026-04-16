"use client";

import { useState } from "react";
import type { VirtualProvider } from "@/lib/types";

type ModelTier = "basic" | "advanced" | "ultra";
type BaseProvider = "google" | "openrouter" | "local";

interface ModelOption {
  id: string; name: string; provider: BaseProvider; tier: ModelTier;
  isLocal?: boolean; clientPrice?: number;
  supportsReasoning?: boolean; supportsTemperature?: boolean;
  description?: string; virtualProviderId?: string;
}

const TIER_OPTIONS = [
  { value: "basic" as const, label: "Базовый" },
  { value: "advanced" as const, label: "Продвинутый" },
  { value: "ultra" as const, label: "Ультра" },
];
const PROVIDER_OPTIONS = [
  { value: "google" as const, label: "Google" },
  { value: "openrouter" as const, label: "OpenRouter" },
  { value: "local" as const, label: "Локальный" },
];

export function ModelForm({
  model,
  providers,
  isNew,
  onSave,
  onCancel,
}: {
  model: ModelOption;
  providers: VirtualProvider[];
  isNew: boolean;
  onSave: (m: ModelOption) => void;
  onCancel: () => void;
}) {
  const [m, setM] = useState<ModelOption>({ ...model });

  function set<K extends keyof ModelOption>(key: K, val: ModelOption[K]) {
    setM((prev) => ({ ...prev, [key]: val }));
  }

  const inputCls =
    "w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500";
  const selectCls =
    "w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/80 p-6">
      <h3 className="text-base font-semibold">
        {isNew ? "Новая модель" : "Редактирование модели"}
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">ID модели</label>
          <input
            type="text"
            value={m.id}
            onChange={(e) => set("id", e.target.value)}
            placeholder="gemini-flash-latest"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Название</label>
          <input
            type="text"
            value={m.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Gemini Flash"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Провайдер</label>
          <select
            value={m.provider}
            onChange={(e) => set("provider", e.target.value as BaseProvider)}
            className={selectCls}
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Виртуальный провайдер
            <span className="ml-1 text-slate-500">(опционально)</span>
          </label>
          <select
            value={m.virtualProviderId ?? ""}
            onChange={(e) => set("virtualProviderId", e.target.value || undefined)}
            className={selectCls}
          >
            <option value="">— Не выбран (из .env) —</option>
            {providers
              .filter((vp) => vp.baseProvider === m.provider)
              .map((vp) => (
                <option key={vp.id} value={vp.id}>{vp.name}</option>
              ))}
            {providers
              .filter((vp) => vp.baseProvider !== m.provider)
              .map((vp) => (
                <option key={vp.id} value={vp.id} className="text-slate-400">
                  {vp.name} ({vp.baseProvider})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Уровень</label>
          <select
            value={m.tier}
            onChange={(e) => set("tier", e.target.value as ModelTier)}
            className={selectCls}
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Цена для клиентов
            <span className="ml-1 text-slate-500">(пусто = скрыта)</span>
          </label>
          <input
            type="number"
            min={0}
            value={m.clientPrice ?? ""}
            onChange={(e) =>
              set("clientPrice", e.target.value === "" ? undefined : Number(e.target.value))
            }
            placeholder="—"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Описание</label>
        <input
          type="text"
          value={m.description ?? ""}
          onChange={(e) => set("description", e.target.value || undefined)}
          placeholder="Краткое описание модели"
          className={inputCls}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={m.supportsTemperature ?? false}
            onChange={(e) => set("supportsTemperature", e.target.checked)}
            className="rounded border-slate-600 bg-slate-700"
          />
          Температура
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={m.supportsReasoning ?? false}
            onChange={(e) => set("supportsReasoning", e.target.checked)}
            className="rounded border-slate-600 bg-slate-700"
          />
          Рассуждения
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Отмена
        </button>
        <button
          onClick={() => onSave(m)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium transition hover:bg-green-500"
        >
          {isNew ? "Добавить" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
