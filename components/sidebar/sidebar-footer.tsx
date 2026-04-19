"use client";

import { useRouter } from "next/navigation";
import { Settings, LogOut, Github, BarChart3 } from "lucide-react";
import { useUserInfo } from "@/hooks/use-user-info";
import { usePluginCapabilities } from "@/hooks/use-plugin-capabilities";

// ─── Component ─────────────────────────────────────────────────────────────

export function SidebarFooter() {
  const router = useRouter();
  const user = useUserInfo();
  const { hasPlugins } = usePluginCapabilities();
  const isAdmin = user?.role === "admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="border-t border-th-border/30 p-3 space-y-1">
      {hasPlugins && (
        <button
          onClick={() => router.push("/usage")}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-th-fg-m transition hover:bg-th-panel hover:text-th-fg"
        >
          <BarChart3 className="h-4 w-4" />
          Потребление
        </button>
      )}
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-th-fg-m transition hover:bg-red-500/10 hover:text-red-400"
      >
        <LogOut className="h-4 w-4" />
        Выйти
      </button>
      {isAdmin ? (
        <button
          onClick={() => router.push("/admin")}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-th-fg-m transition hover:bg-th-panel hover:text-th-fg"
        >
          <Settings className="h-4 w-4" />
          Админ-панель
        </button>
      ) : (
        <a
          href="https://github.com/lemix/fameowly"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-th-fg-m transition hover:bg-th-panel hover:text-th-fg"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      )}
      {!isAdmin && (
        <p className="px-3 pt-1 text-xs text-th-fg-f">
          © 2026 Fameowly
        </p>
      )}
    </div>
  );
}
