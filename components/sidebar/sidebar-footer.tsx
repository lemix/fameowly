"use client";

import { useRouter } from "next/navigation";
import { Settings, LogOut, Github, BarChart2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserInfo } from "@/hooks/use-user-info";
import { usePluginCapabilities } from "@/hooks/use-plugin-capabilities";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FooterItem {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
}

interface SidebarFooterProps {
  /** Icon-only row instead of labelled rows — short viewports and open keyboards */
  compact?: boolean;
  className?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const rowCls =
  "flex w-full items-center gap-[5px] text-left text-sm text-th-fg transition hover:text-th-accent";
const iconBtnCls =
  "flex h-10 w-10 items-center justify-center rounded-[10px] text-th-fg-m transition hover:text-th-accent";
const iconCls = "h-6 w-6 shrink-0 text-th-fg-m";

// ─── Component ─────────────────────────────────────────────────────────────

export function SidebarFooter({ compact, className }: SidebarFooterProps) {
  const router = useRouter();
  const user = useUserInfo();
  const { uiSlots } = usePluginCapabilities();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Item count varies by edition (usage-page slot) and role — both renderings share it
  const items: FooterItem[] = [
    ...(uiSlots.includes("usage-page")
      ? [{ key: "usage", icon: BarChart2, label: "Потребление", onClick: () => router.push("/usage") }]
      : []),
    ...(user?.role === "admin"
      ? [{ key: "admin", icon: Settings, label: "Админ-панель", onClick: () => router.push("/admin") }]
      : []),
    { key: "logout", icon: LogOut, label: "Выйти", onClick: handleLogout },
    { key: "github", icon: Github, label: "GitHub", href: "https://github.com/lemix/fameowly" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col border-t border-th-border pl-[26px] pr-5",
        compact ? "pt-3 pb-2" : "gap-[10px] pt-[29px] pb-[18px]",
        className,
      )}
      data-testid="sidebar-footer"
      data-compact={compact ? "true" : "false"}
    >
      {compact ? (
        <div className="-ml-2 flex items-center gap-1">
          {items.map(({ key, icon: Icon, label, onClick, href }) =>
            href ? (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={label}
                data-testid={`footer-${key}`}
                className={iconBtnCls}
              >
                <Icon className={iconCls} strokeWidth={1.5} />
              </a>
            ) : (
              <button
                key={key}
                onClick={onClick}
                title={label}
                aria-label={label}
                data-testid={`footer-${key}`}
                className={iconBtnCls}
              >
                <Icon className={iconCls} strokeWidth={1.5} />
              </button>
            ),
          )}
        </div>
      ) : (
        items.map(({ key, icon: Icon, label, onClick, href }) =>
          href ? (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`footer-${key}`}
              className={rowCls}
            >
              <Icon className={iconCls} strokeWidth={1.5} />
              {label}
            </a>
          ) : (
            <button key={key} onClick={onClick} data-testid={`footer-${key}`} className={rowCls}>
              <Icon className={iconCls} strokeWidth={1.5} />
              {label}
            </button>
          ),
        )
      )}

      <p className={cn("pl-1 text-sm leading-[17px] text-th-fg-f", compact ? "mt-2" : "mt-[14px]")}>
        © 2026 Fameowly
      </p>
    </div>
  );
}
