"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "lucide-react";
import { PluginSlot } from "@/lib/plugin-ui";
import { useUserInfo } from "@/hooks/use-user-info";
import { AddUserForm } from "./add-user-form";
import { UserRow } from "./user-row";
import { UserSettingsModal } from "./user-settings-modal";
import { ResetPasswordModal } from "./reset-password-modal";
import { cardCls } from "@/lib/ui-classes";
import type { UserRecord } from "./types";

function loadUsers(): Promise<UserRecord[]> {
  return fetch("/api/users")
    .then((r) => (r.ok ? r.json() : { users: [] }))
    .then((data) => (data.users ?? []) as UserRecord[])
    .catch(() => []);
}

export function UsersPanel({ hasUsageSlot }: { hasUsageSlot: boolean }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [settingsUser, setSettingsUser] = useState<UserRecord | null>(null);
  const [resetUser, setResetUser] = useState<UserRecord | null>(null);
  const [usageUser, setUsageUser] = useState<UserRecord | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Bumped after every change so plugin-owned profile data is refetched
  const [profileVersion, setProfileVersion] = useState(0);
  const [allowedIds, setAllowedIds] = useState<string[] | null>(null);
  const currentUserId = useUserInfo()?.id;

  useEffect(() => {
    let cancelled = false;
    loadUsers().then((list) => { if (!cancelled) setUsers(list); });
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(() => {
    loadUsers().then(setUsers);
    setProfileVersion((v) => v + 1);
  }, []);

  const showMessage = useCallback((msg: string, isError = false) => {
    setError(isError ? msg : "");
    setSuccess(isError ? "" : msg);
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3000);
  }, []);

  const notifySaved = useCallback((msg: string) => {
    showMessage(msg);
    refresh();
  }, [showMessage, refresh]);

  const notifyError = useCallback((msg: string) => showMessage(msg, true), [showMessage]);

  const applyFilter = useCallback((ids: string[] | null) => setAllowedIds(ids), []);

  async function createUser(name: string, password: string, role: "user" | "admin") {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error, true);
      return null;
    }
    showMessage(`Пользователь ${data.user.name} создан`);
    return data.user.id as string;
  }

  async function deleteUser(user: UserRecord) {
    if (!confirm(`Удалить пользователя "${user.name}"?`)) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error, true);
      return;
    }
    notifySaved(`Пользователь "${user.name}" удалён`);
  }

  const visible = allowedIds ? users.filter((u) => allowedIds.includes(u.id)) : users;
  // Stable identity keeps the filter slot from re-running on every render
  const userIds = useMemo(() => users.map((u) => u.id), [users]);

  return (
    <>
      {error && (        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          {success}
        </div>
      )}

      <AddUserForm onCreate={createUser} onDone={refresh} />

      <div className={cardCls}>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <User className="h-5 w-5 text-th-fg-m" />
          Пользователи ({visible.length}
          {visible.length !== users.length && ` из ${users.length}`})
        </h2>

        <PluginSlot
          id="user-filter"
          props={{ version: profileVersion, userIds, onChange: applyFilter }}
        />

        <div className="space-y-2">
          {visible.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              profileVersion={profileVersion}
              showUsage={hasUsageSlot}
              onSettings={() => setSettingsUser(u)}
              onUsage={() => setUsageUser(u)}
              onResetPassword={() => setResetUser(u)}
              onDelete={() => deleteUser(u)}
            />
          ))}
          {visible.length === 0 && (
            <p className="py-4 text-center text-sm text-th-fg-f">
              Никто не подходит под фильтр
            </p>
          )}
        </div>
      </div>

      {settingsUser && (
        <UserSettingsModal
          user={settingsUser}
          isSelf={settingsUser.id === currentUserId}
          onSaved={notifySaved}
          onError={notifyError}
          onClose={() => setSettingsUser(null)}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onSaved={notifySaved}
          onError={notifyError}
          onClose={() => setResetUser(null)}
        />
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
  );
}
