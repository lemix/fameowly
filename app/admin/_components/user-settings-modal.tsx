"use client";

import { useState, useRef, useCallback } from "react";
import { PluginSlot } from "@/lib/plugin-ui";
import {
  selectCls,
  labelCls,
  btnPrimary,
  btnGhost,
  overlayCls,
  modalCls,
} from "@/lib/ui-classes";
import type { UserRecord } from "./types";

interface UserSettingsModalProps {
  user: UserRecord;
  /** Own role is locked: an admin must not demote themselves */
  isSelf: boolean;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

type Commit = () => Promise<void>;

export function UserSettingsModal({
  user,
  isSelf,
  onSaved,
  onError,
  onClose,
}: UserSettingsModalProps) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const pluginCommit = useRef<Commit | null>(null);

  // Stable identity: the plugin editor re-registers only when its draft changes
  const registerCommit = useCallback((fn: Commit) => {
    pluginCommit.current = fn;
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await pluginCommit.current?.();

      if (role !== user.role) {
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id, role }),
        });
        const data = await res.json();
        if (!res.ok) {
          onError(data.error);
          return;
        }
        onSaved(`Настройки «${user.name}» сохранены, сессии сброшены`);
      } else {
        onSaved(`Настройки «${user.name}» сохранены`);
      }
      onClose();
    } catch {
      onError("Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={overlayCls} onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className={modalCls}
      >
        <h3 className="mb-1 text-base font-semibold">Настройки пользователя</h3>
        <p className="mb-4 text-sm text-th-fg-m">
          <strong className="text-th-fg">{user.name}</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Роль</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRecord["role"])}
              disabled={isSelf}
              className={`${selectCls} disabled:opacity-60`}
            >
              <option value="user">Пользователь</option>
              <option value="admin">Админ</option>
            </select>
            {isSelf && (
              <p className="mt-1 text-xs text-th-fg-f">
                Свою роль изменить нельзя
              </p>
            )}
          </div>

          <PluginSlot
            id="user-profile"
            props={{ userId: user.id, mode: "editor", registerCommit }}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Отмена
          </button>
          <button type="submit" disabled={saving} className={`${btnPrimary} disabled:opacity-60`}>
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
