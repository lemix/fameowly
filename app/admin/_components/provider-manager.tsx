"use client";

import { useState, useCallback, useEffect } from "react";
import type { VirtualProvider, BaseProvider, KeyGroup } from "@/lib/types";

const EMPTY_GROUP: KeyGroup = { keys: [], rotationThreshold: 10 };
const ROLES = ["admin", "user", "family", "client"] as const;
const BASE_PROVIDERS: { value: BaseProvider; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "local", label: "Локальный" },
];

export function ProviderManager() {
  const [providers, setProviders] = useState<VirtualProvider[]>([]);
  const [editing, setEditing] = useState<VirtualProvider | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProviders = useCallback(async () => {
    const res = await fetch("/api/providers");
    if (res.ok) {
      const data = await res.json();
      setProviders(data.providers);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function showMsg(msg: string, isErr = false) {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  }

  function startNew() {
    setEditing({
      id: `vp-${Date.now()}`,
      name: "",
      baseProvider: "google",
      groups: { default: { ...EMPTY_GROUP } },
    });
  }

  function startEdit(vp: VirtualProvider) {
    setEditing(structuredClone(vp));
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      showMsg("Укажите название провайдера", true);
      return;
    }
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      const data = await res.json();
      showMsg(data.error || "Ошибка сохранения", true);
      return;
    }
    showMsg("Провайдер сохранён");
    setEditing(null);
    fetchProviders();
  }

  async function remove(id: string) {
    if (!confirm("Удалить виртуального провайдера?")) return;
    const res = await fetch("/api/providers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showMsg("Провайдер удалён");
      fetchProviders();
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400">
          {success}
        </div>
      )}

      {editing ? (
        <ProviderForm
          provider={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <ProviderList
          providers={providers}
          onNew={startNew}
          onEdit={startEdit}
          onDelete={remove}
        />
      )}
    </div>
  );
}

// ─── Provider List ───────────────────────────────────────────────────

function ProviderList({
  providers,
  onNew,
  onEdit,
  onDelete,
}: {
  providers: VirtualProvider[];
  onNew: () => void;
  onEdit: (vp: VirtualProvider) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Виртуальные провайдеры ({providers.length})
        </h2>
        <button
          onClick={onNew}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
        >
          + Новый провайдер
        </button>
      </div>

      {providers.length === 0 && (
        <p className="text-sm text-slate-400">
          Нет виртуальных провайдеров. Ключи берутся из .env.
        </p>
      )}

      {providers.map((vp) => (
        <div
          key={vp.id}
          className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3"
        >
          <div>
            <span className="font-medium">{vp.name}</span>
            <span className="ml-2 rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {vp.baseProvider}
            </span>
            <span className="ml-2 text-xs text-slate-500">
              {Object.keys(vp.groups).length} групп
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(vp)}
              className="rounded px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Изменить
            </button>
            <button
              onClick={() => onDelete(vp.id)}
              className="rounded px-3 py-1 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Provider Form (Wizard) ──────────────────────────────────────────

function ProviderForm({
  provider,
  onChange,
  onSave,
  onCancel,
}: {
  provider: VirtualProvider;
  onChange: (vp: VirtualProvider) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);

  function updateField<K extends keyof VirtualProvider>(
    key: K,
    value: VirtualProvider[K],
  ) {
    onChange({ ...provider, [key]: value });
  }

  function addGroup(role: string) {
    if (provider.groups[role]) return;
    onChange({
      ...provider,
      groups: { ...provider.groups, [role]: { ...EMPTY_GROUP } },
    });
  }

  function removeGroup(role: string) {
    const next = { ...provider.groups };
    delete next[role];
    onChange({ ...provider, groups: next });
  }

  function updateGroupKeys(role: string, keysText: string) {
    const keys = keysText
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);
    onChange({
      ...provider,
      groups: {
        ...provider.groups,
        [role]: { ...provider.groups[role], keys },
      },
    });
  }

  function updateGroupThreshold(role: string, threshold: number) {
    onChange({
      ...provider,
      groups: {
        ...provider.groups,
        [role]: { ...provider.groups[role], rotationThreshold: threshold },
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex gap-2 text-xs text-slate-400">
        <span className={step === 0 ? "text-blue-400 font-medium" : ""}>
          1. Основные
        </span>
        <span>→</span>
        <span className={step === 1 ? "text-blue-400 font-medium" : ""}>
          2. Ключи по группам
        </span>
      </div>

      {step === 0 && (
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/80 p-6">
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Название
            </label>
            <input
              type="text"
              value={provider.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Google Free, Local Cluster…"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Базовый провайдер
            </label>
            <select
              value={provider.baseProvider}
              onChange={(e) =>
                updateField("baseProvider", e.target.value as BaseProvider)
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {BASE_PROVIDERS.map((bp) => (
                <option key={bp.value} value={bp.value}>
                  {bp.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Отмена
            </button>
            <button
              onClick={() => setStep(1)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
            >
              Далее →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Группы ключей</h3>
              <div className="flex gap-1">
                {ROLES.filter((r) => !provider.groups[r]).map((r) => (
                  <button
                    key={r}
                    onClick={() => addGroup(r)}
                    className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600"
                  >
                    + {r}
                  </button>
                ))}
                {!provider.groups["default"] && (
                  <button
                    onClick={() => addGroup("default")}
                    className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600"
                  >
                    + default
                  </button>
                )}
              </div>
            </div>

            {Object.keys(provider.groups).length === 0 && (
              <p className="text-sm text-slate-400">
                Добавьте хотя бы одну группу ключей
              </p>
            )}

            {Object.entries(provider.groups).map(([role, group]) => (
              <GroupEditor
                key={role}
                role={role}
                group={group}
                isLocal={provider.baseProvider === "local"}
                onKeysChange={(text) => updateGroupKeys(role, text)}
                onThresholdChange={(t) => updateGroupThreshold(role, t)}
                onRemove={() => removeGroup(role)}
              />
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(0)}
              className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              ← Назад
            </button>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Отмена
              </button>
              <button
                onClick={onSave}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium transition hover:bg-green-500"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group Editor ────────────────────────────────────────────────────

function GroupEditor({
  role,
  group,
  isLocal,
  onKeysChange,
  onThresholdChange,
  onRemove,
}: {
  role: string;
  group: KeyGroup;
  isLocal: boolean;
  onKeysChange: (text: string) => void;
  onThresholdChange: (t: number) => void;
  onRemove: () => void;
}) {
  const ROLE_LABELS: Record<string, string> = {
    admin: "Админ",
    user: "Пользователь",
    family: "Семья",
    client: "Клиент",
    default: "По умолчанию",
  };

  return (
    <div className="mb-4 rounded-lg border border-slate-600 bg-slate-900/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          {ROLE_LABELS[role] || role}
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Удалить группу
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            {isLocal ? "URL-адреса (по одному на строку)" : "API-ключи (по одному на строку)"}
          </label>
          <textarea
            value={group.keys.join("\n")}
            onChange={(e) => onKeysChange(e.target.value)}
            rows={3}
            placeholder={isLocal ? "http://192.168.1.10:8080/v1" : "sk-..."}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
          <span className="text-xs text-slate-500">
            {group.keys.length} {isLocal ? "адресов" : "ключей"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Порог ротации:</label>
          <input
            type="number"
            min={0}
            value={group.rotationThreshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-20 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
          />
          <span className="text-xs text-slate-500">запросов на ключ (0 = без ротации)</span>
        </div>
      </div>
    </div>
  );
}
