"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import { ModelForm } from "./model-form";
import { ModelList } from "./model-list";
import type { VirtualProvider } from "@/lib/types";

type ModelTier = "basic" | "advanced" | "ultra";
type BaseProvider = "google" | "openrouter" | "local";

interface ModelOption {
  id: string;
  name: string;
  provider: BaseProvider;
  tier: ModelTier;
  isLocal?: boolean;
  clientPrice?: number;
  supportsReasoning?: boolean;
  supportsTemperature?: boolean;
  description?: string;
  virtualProviderId?: string;
}

interface ModelsConfig {
  chatModels: ModelOption[];
  imageModels: ModelOption[];
}

const EMPTY_MODEL: ModelOption = {
  id: "",
  name: "",
  provider: "google",
  tier: "basic",
  supportsTemperature: true,
  supportsReasoning: false,
  description: "",
};

export function ModelManager() {
  const [config, setConfig] = useState<ModelsConfig>({ chatModels: [], imageModels: [] });
  const [providers, setProviders] = useState<VirtualProvider[]>([]);
  const [tab, setTab] = useState<"chat" | "image">("chat");
  const [editing, setEditing] = useState<{
    model: ModelOption; index: number; list: "chat" | "image";
  } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    const [modelsRes, providersRes] = await Promise.all([
      fetch("/api/models"),
      fetch("/api/providers"),
    ]);
    if (modelsRes.ok) setConfig(await modelsRes.json());
    if (providersRes.ok) {
      const data = await providersRes.json();
      setProviders(data.providers ?? []);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function showMsg(msg: string, isErr = false) {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  }

  async function saveConfig(next: ModelsConfig) {
    const res = await fetch("/api/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      const data = await res.json();
      showMsg(data.error || "Ошибка сохранения", true);
      return false;
    }
    setConfig(next);
    showMsg("Модели сохранены");
    return true;
  }

  function addModel() {
    setEditing({ model: { ...EMPTY_MODEL }, index: -1, list: tab });
  }

  async function deleteModel(index: number) {
    if (!confirm("Удалить эту модель?")) return;
    const key = tab === "chat" ? "chatModels" : "imageModels";
    const next = { ...config, [key]: config[key].filter((_, i) => i !== index) };
    await saveConfig(next);
  }

  async function saveModel(model: ModelOption) {
    if (!editing) return;
    if (!model.id || !model.name) {
      showMsg("ID и Название обязательны", true);
      return;
    }
    const key = editing.list === "chat" ? "chatModels" : "imageModels";
    const list = [...config[key]];
    if (editing.index === -1) list.push(model);
    else list[editing.index] = model;
    const ok = await saveConfig({ ...config, [key]: list });
    if (ok) setEditing(null);
  }

  const models = tab === "chat" ? config.chatModels : config.imageModels;

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
        <ModelForm
          model={editing.model}
          providers={providers}
          isNew={editing.index === -1}
          onSave={saveModel}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
              <button
                onClick={() => setTab("chat")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === "chat" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Чат ({config.chatModels.length})
              </button>
              <button
                onClick={() => setTab("image")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === "image" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Изображения ({config.imageModels.length})
              </button>
            </div>
            <button
              onClick={addModel}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>

          <ModelList
            models={models}
            providers={providers}
            onEdit={(m, i) => setEditing({ model: { ...m }, index: i, list: tab })}
            onDelete={deleteModel}
          />
        </>
      )}
    </div>
  );
}
