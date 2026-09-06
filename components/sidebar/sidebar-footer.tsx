"use client";

import { useRouter } from "next/navigation";
import { Settings, LogOut, Github, BarChart2 } from "lucide-react";
import { useUserInfo } from "@/hooks/use-user-info";
import { usePluginCapabilities } from "@/hooks/use-plugin-capabilities";

// ─── Constants ─────────────────────────────────────────────────────────────

const rowCls =
  "flex w-full items-center gap-[5px] text-left text-sm text-th-fg transition hover:text-th-accent";
const iconCls = "h-6 w-6 shrink-0 text-th-fg-m";

// ─── Component ─────────────────────────────────────────────────────────────

export function SidebarFooter() {
  const router = useRouter();
  const user = useUserInfo();
  const { uiSlots } = usePluginCapabilities();
  const isAdmin = user?.role === "admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex flex-col gap-[10px] border-t border-th-border pl-[26px] pr-5 pt-[29px] pb-[18px]">
      {uiSlots.includes("usage-page") && (
        <button onClick={() => router.push("/usage")} className={rowCls}>
          <BarChart2 className={iconCls} strokeWidth={1.5} />
          Потребление
        </button>
      )}

      {isAdmin && (
        <button onClick={() => router.push("/admin")} className={rowCls}>
          <Settings className={iconCls} strokeWidth={1.5} />
          Админ-панель
        </button>
      )}

      <button onClick={handleLogout} className={rowCls}>
        <LogOut className={iconCls} strokeWidth={1.5} />
        Выйти
      </button>

      <a
        href="https://github.com/lemix/fameowly"
        target="_blank"
        rel="noopener noreferrer"
        className={rowCls}
      >
        <Github className={iconCls} strokeWidth={1.5} />
        GitHub
      </a>

      <p className="mt-[14px] pl-1 text-sm leading-[17px] text-th-fg-f">© 2026 Fameowly</p>
    </div>
  );
}
