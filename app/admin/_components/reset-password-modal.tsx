"use client";

import { useState } from "react";
import {
  inputCls,
  labelCls,
  btnPrimary,
  btnGhost,
  overlayCls,
  modalCls,
} from "@/lib/ui-classes";
import type { UserRecord } from "./types";

interface ResetPasswordModalProps {
  user: UserRecord;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export function ResetPasswordModal({
  user,
  onSaved,
  onError,
  onClose,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, newPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error);
      return;
    }
    onSaved(`Пароль «${user.name}» сброшен, сессии сброшены`);
    onClose();
  }

  return (
    <div className={overlayCls} onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className={modalCls}>
        <h3 className="mb-1 text-base font-semibold">Сбросить пароль</h3>
        <p className="mb-4 text-sm text-th-fg-m">
          Для: <strong className="text-th-fg">{user.name}</strong>
        </p>

        <label className={labelCls}>Новый пароль</label>
        <input
          type="text"
          placeholder="Новый пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className={inputCls}
        />

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Отмена
          </button>
          <button type="submit" className={btnPrimary}>
            Сбросить
          </button>
        </div>
      </form>
    </div>
  );
}
