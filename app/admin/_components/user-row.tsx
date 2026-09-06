"use client";

import { Settings, Trash2, KeyRound, BarChart3 } from "lucide-react";
import { PluginSlot } from "@/lib/plugin-ui";
import { iconBtn, iconBtnDanger } from "@/lib/ui-classes";
import { ROLE_LABELS, type UserRecord } from "./types";

interface UserRowProps {
  user: UserRecord;
  /** Changes when plugin-owned profile data must be refetched */
  profileVersion: number;
  showUsage: boolean;
  onSettings: () => void;
  onUsage: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}

/** Read-only summary of one user; every edit happens in the settings modal */
export function UserRow({
  user,
  profileVersion,
  showUsage,
  onSettings,
  onUsage,
  onResetPassword,
  onDelete,
}: UserRowProps) {
  const isAdmin = user.role === "admin";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-th-border bg-th-page/50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isAdmin ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-th-accent"
          }`}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <span className="font-medium">{user.name}</span>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-th-fg-m">
            <span className={isAdmin ? "text-amber-400" : undefined}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>            <PluginSlot
              id="user-profile"
              props={{ userId: user.id, mode: "summary", version: profileVersion }}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onSettings} className={iconBtn} title="Настройки">
          <Settings className="h-4 w-4" />
        </button>
        {showUsage && (
          <button onClick={onUsage} className={iconBtn} title="Потребление">
            <BarChart3 className="h-4 w-4" />
          </button>
        )}
        <button onClick={onResetPassword} className={iconBtn} title="Сбросить пароль">
          <KeyRound className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className={iconBtnDanger} title="Удалить">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
