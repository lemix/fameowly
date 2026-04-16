"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  KeyRound,
  Shield,
  User,
} from "lucide-react";
import type { PluginAdminTab } from "@/lib/types";

interface UserRecord {
  id: string;
  name: string;
  role: "admin" | "user" | "family" | "client";
}

interface PremiumStatus {
  premium: boolean;
  plugins: string[];
  adminTabs: PluginAdminTab[];
}

/** Lazily loaded plugin tab components keyed by tab id */
const pluginComponents: Record<string, React.ComponentType> = {};

function getTabComponent(tab: PluginAdminTab): React.ComponentType | null {
  if (!pluginComponents[tab.id]) {
    // Known component mappings — each must be a static string for the bundler
    const loaders: Record<string, () => Promise<Record<string, React.ComponentType>>> = {
      "providers": () => import("@premium/plugins/providers/components/provider-manager"),
      "models": () => import("@premium/plugins/providers/components/model-manager"),
    };
    const loader = loaders[tab.id];
    if (!loader) return null;
    pluginComponents[tab.id] = dynamic(
      () => loader().then((mod) => {
        // Find the first exported component
        const Component = Object.values(mod).find((v) => typeof v === "function") as React.ComponentType;
        return { default: Component };
      }),
      { loading: () => <div className="text-slate-400 py-8 text-center">Загрузка…</div> },
    );
  }
  return pluginComponents[tab.id];
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "family" | "client">("user");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/premium/status")
      .then((r) => r.json())
      .then((data: PremiumStatus) => setPremiumStatus(data))
      .catch(() => setPremiumStatus({ premium: false, plugins: [], adminTabs: [] }));
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function showMessage(msg: string, isError = false) {
    if (isError) {
      setError(msg);
      setSuccess("");
    } else {
      setSuccess(msg);
      setError("");
    }
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3000);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, password: newPass, role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error, true);
      return;
    }
    setNewName("");
    setNewPass("");
    setNewRole("user");
    showMessage(`Пользователь ${data.user.name} создан`);
    fetchUsers();
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Удалить пользователя "${name}"?`)) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error, true);
      return;
    }
    showMessage(`Пользователь "${name}" удалён`);
    fetchUsers();
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetId) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resetId, newPassword: resetPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error, true);
      return;
    }
    setResetId(null);
    setResetPass("");
    showMessage("Пароль сброшен");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-700 px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Чат
        </button>
        <h1 className="text-lg font-bold">
          <Shield className="mr-2 inline h-5 w-5 text-amber-400" />
          Админ-панель
        </h1>
      </header>

      {/* Tabs */}
      <div className="mx-auto w-full max-w-2xl px-6 pt-6">
        <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "users"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            Пользователи
          </button>
          {premiumStatus?.adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        {activeTab !== "users" && premiumStatus ? (
          (() => {
            const tab = premiumStatus.adminTabs.find((t) => t.id === activeTab);
            if (!tab) return null;
            const TabComponent = getTabComponent(tab);
            if (!TabComponent) return null;
            return <TabComponent />;
          })()
        ) : (
          <>
        {/* Messages */}
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

        {/* Add User Form */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/80 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-5 w-5 text-blue-400" />
            Добавить пользователя
          </h2>
          <form onSubmit={addUser} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Имя"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="flex-1 min-w-[120px] rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Пароль"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              className="flex-1 min-w-[120px] rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "user" | "admin" | "family" | "client")}
              className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="user">Пользователь</option>
              <option value="family">Семья</option>
              <option value="client">Клиент</option>
              <option value="admin">Админ</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
            >
              Добавить
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <User className="h-5 w-5 text-slate-400" />
            Пользователи ({users.length})
          </h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      u.role === "admin"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">{u.name}</span>
                    <span className="ml-2 rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                      {{ admin: "Админ", user: "Пользователь", family: "Семья", client: "Клиент" }[u.role]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setResetId(u.id);
                      setResetPass("");
                    }}
                    className="rounded p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                    title="Сбросить пароль"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
                    className="rounded p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset Password Modal */}
        {resetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <form
              onSubmit={resetPassword}
              className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl"
            >
              <h3 className="mb-4 text-base font-semibold">Сбросить пароль</h3>
              <p className="mb-3 text-sm text-slate-400">
                Для:{" "}
                <strong className="text-white">
                  {users.find((u) => u.id === resetId)?.name}
                </strong>
              </p>
              <input
                type="text"
                placeholder="Новый пароль"
                value={resetPass}
                onChange={(e) => setResetPass(e.target.value)}
                required
                autoFocus
                className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetId(null)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
                >
                  Сбросить
                </button>
              </div>
            </form>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
