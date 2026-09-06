"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  KeyRound,
  Shield,
  User,
  BarChart3,
} from "lucide-react";
import type { PluginAdminTab } from "@/lib/types";
import { PluginSlot } from "@/lib/plugin-ui";

interface UserRecord {
  id: string;
  name: string;
  role: "admin" | "user" | "family" | "client";
}

interface PluginStatus {
  hasPlugins: boolean;
  plugins: string[];
  adminTabs: PluginAdminTab[];
  uiSlots: string[];
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "family" | "client">("user");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [usageUser, setUsageUser] = useState<UserRecord | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [pluginStatus, setPluginStatus] = useState<PluginStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/plugins/capabilities")
      .then((r) => r.json())
      .then((data: PluginStatus) => setPluginStatus(data))
      .catch(() => setPluginStatus({ hasPlugins: false, plugins: [], adminTabs: [], uiSlots: [] }));
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
    <div className="flex h-[100dvh] flex-col bg-th-page text-th-fg overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-th-border px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-th-fg-s transition hover:bg-th-panel hover:text-th-fg"
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
        <div className="flex gap-1 rounded-lg bg-th-panel p-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "users"
                ? "bg-th-subtle text-th-fg"
                : "text-th-fg-m hover:text-th-fg"
            }`}
          >
            <User className="h-4 w-4" />
            Пользователи
          </button>
          {pluginStatus?.adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                ? "bg-th-subtle text-th-fg"
                : "text-th-fg-m hover:text-th-fg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        {activeTab !== "users" && pluginStatus ? (
          <PluginSlot id={activeTab} />
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
        <div className="mb-8 rounded-xl border border-th-border bg-th-panel/80 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-5 w-5 text-th-accent" />
            Добавить пользователя
          </h2>
          <form onSubmit={addUser} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Имя"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="flex-1 min-w-[120px] rounded-lg border border-th-border-s bg-th-input px-3 py-2 text-sm text-th-fg placeholder-th-fg-m outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Пароль"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              className="flex-1 min-w-[120px] rounded-lg border border-th-border-s bg-th-input px-3 py-2 text-sm text-th-fg placeholder-th-fg-m outline-none focus:border-blue-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "user" | "admin" | "family" | "client")}
              className="rounded-lg border border-th-border-s bg-th-input px-3 py-2 text-sm text-th-fg outline-none focus:border-blue-500"
            >
              <option value="user">Пользователь</option>
              <option value="family">Семья</option>
              <option value="client">Клиент</option>
              <option value="admin">Админ</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Добавить
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-th-border bg-th-panel/80 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <User className="h-5 w-5 text-th-fg-m" />
            Пользователи ({users.length})
          </h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-th-border bg-th-page/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      u.role === "admin"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-th-accent"
                    }`}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">{u.name}</span>
                    <span className="ml-2 rounded bg-th-subtle px-2 py-0.5 text-xs text-th-fg-s">
                      {{ admin: "Админ", user: "Пользователь", family: "Семья", client: "Клиент" }[u.role]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pluginStatus?.uiSlots.includes("user-usage") && (
                    <button
                      onClick={() => setUsageUser(u)}
                      className="rounded p-2 text-th-fg-m transition hover:bg-th-subtle hover:text-th-fg"
                      title="Потребление"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setResetId(u.id);
                      setResetPass("");
                    }}
                    className="rounded p-2 text-th-fg-m transition hover:bg-th-subtle hover:text-th-fg"
                    title="Сбросить пароль"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
                    className="rounded p-2 text-th-fg-m transition hover:bg-red-500/10 hover:text-red-400"
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
              className="w-full max-w-sm rounded-xl border border-th-border bg-th-panel p-6 shadow-2xl"
            >
              <h3 className="mb-4 text-base font-semibold">Сбросить пароль</h3>
              <p className="mb-3 text-sm text-th-fg-m">
                Для:{" "}
                <strong className="text-th-fg">
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
                className="mb-4 w-full rounded-lg border border-th-border-s bg-th-input px-3 py-2 text-sm text-th-fg placeholder-th-fg-m outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetId(null)}
                  className="rounded-lg px-4 py-2 text-sm text-th-fg-s transition hover:bg-th-subtle"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  Сбросить
                </button>
              </div>
            </form>
          </div>
        )}

        {usageUser && (
          <PluginSlot
            id="user-usage"
            props={{
              userId: usageUser.id,
              userName: usageUser.name,
              onClose: () => setUsageUser(null),
            }}
          />
        )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
