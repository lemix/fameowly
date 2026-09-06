"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-th-page via-th-panel to-th-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-th-border bg-th-panel/80 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fameowly.svg" alt="Fameowly" width={343} height={71} className="hidden h-10 w-auto select-none dark:block" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fameowly-light.svg" alt="Fameowly" width={343} height={71} className="block h-10 w-auto select-none dark:hidden" draggable={false} />
          <p className="text-sm text-th-fg-m">Войдите в свой аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-th-fg-s">
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-th-border-s bg-th-input px-4 py-2.5 text-th-fg placeholder-th-fg-m outline-none transition focus:border-th-accent focus:ring-2 focus:ring-th-accent-ring"
              placeholder="Ваше имя"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-th-fg-s">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-th-border-s bg-th-input px-4 py-2.5 text-th-fg placeholder-th-fg-m outline-none transition focus:border-th-accent focus:ring-2 focus:ring-th-accent-ring"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-th-accent py-2.5 font-semibold text-white transition hover:bg-th-accent-muted disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
