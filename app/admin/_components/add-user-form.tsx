"use client";

import { useState, useRef, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { PluginSlot } from "@/lib/plugin-ui";
import { inputCls, selectCls, labelCls, btnPrimary, cardCls } from "@/lib/ui-classes";

type Commit = (userId?: string) => Promise<void>;

interface AddUserFormProps {
  /** Returns the new user id, or null when creation failed */
  onCreate: (name: string, password: string, role: "user" | "admin") => Promise<string | null>;
  /** Called once the profile of the new user has been written too */
  onDone: () => void;
}

export function AddUserForm({ onCreate, onDone }: AddUserFormProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [formKey, setFormKey] = useState(0);
  const pluginCommit = useRef<Commit | null>(null);

  const registerCommit = useCallback((fn: Commit) => {
    pluginCommit.current = fn;
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const userId = await onCreate(name, password, role);
    if (!userId) return;

    if (role !== "admin") await pluginCommit.current?.(userId);
    onDone();

    setName("");
    setPassword("");
    setRole("user");
    setFormKey((k) => k + 1);
  }

  return (
    <div className={`mb-8 ${cardCls}`}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <UserPlus className="h-5 w-5 text-th-accent" />
        Добавить пользователя
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Имя</label>
            <input
              type="text"
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Пароль</label>
            <input
              type="text"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Роль</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className={selectCls}
            >
              <option value="user">Пользователь</option>
              <option value="admin">Админ</option>
            </select>
          </div>
        </div>

        {/* Admins bypass rate plans, so the section is pointless for them */}
        {role !== "admin" && (
          <PluginSlot
            key={formKey}
            id="user-profile"
            props={{ userId: "", mode: "editor", registerCommit }}
          />
        )}

        <div className="flex justify-end">
          <button type="submit" className={btnPrimary}>
            Добавить
          </button>
        </div>
      </form>
    </div>
  );
}
