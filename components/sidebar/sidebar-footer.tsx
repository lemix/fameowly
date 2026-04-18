"use client";

import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";

// ─── Component ───────────────────────────────────────────────────────

export function SidebarFooter() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="border-t border-th-border/30 p-3 space-y-1">
      <button
        onClick={() => router.push("/admin")}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-th-fg-m transition hover:bg-th-panel hover:text-th-fg"
      >
        <Settings className="h-4 w-4" />
        Админ-панель
      </button>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-th-fg-m transition hover:bg-red-500/10 hover:text-red-400"
      >
        <LogOut className="h-4 w-4" />
        Выйти
      </button>
    </div>
  );
}
