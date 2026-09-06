"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, User } from "lucide-react";
import type { PluginAdminTab } from "@/lib/types";
import { PluginSlot } from "@/lib/plugin-ui";
import { UsersPanel } from "./_components/users-panel";

interface PluginStatus {
  hasPlugins: boolean;
  plugins: string[];
  adminTabs: PluginAdminTab[];
  uiSlots: string[];
}

const EMPTY_STATUS: PluginStatus = {
  hasPlugins: false,
  plugins: [],
  adminTabs: [],
  uiSlots: [],
};

function tabCls(active: boolean): string {
  return `flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
    active ? "bg-th-subtle text-th-fg" : "text-th-fg-m hover:text-th-fg"
  }`;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [status, setStatus] = useState<PluginStatus>(EMPTY_STATUS);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plugins/capabilities")
      .then((r) => (r.ok ? r.json() : EMPTY_STATUS))
      .then((data: PluginStatus) => { if (!cancelled) setStatus(data); })
      .catch(() => { /* stay with no plugins */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-th-page text-th-fg">
      <header className="flex items-center gap-4 border-b border-th-border px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-th-fg-s transition hover:bg-th-panel hover:text-th-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Чат
        </button>
        <h1 className="text-lg font-bold">
          <Shield className="mr-2 inline h-5 w-5 text-amber-400" />
          Админ-панель
        </h1>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pt-6">
        <div className="flex gap-1 rounded-lg bg-th-panel p-1">
          <button onClick={() => setActiveTab("users")} className={tabCls(activeTab === "users")}>
            <User className="h-4 w-4" />
            Пользователи
          </button>
          {status.adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={tabCls(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-6 py-8">
          {activeTab === "users" ? (
            <UsersPanel hasUsageSlot={status.uiSlots.includes("user-usage")} />
          ) : (
            <PluginSlot id={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}
