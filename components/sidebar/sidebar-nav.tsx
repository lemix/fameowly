"use client";

import { useEffect, useRef } from "react";
import { SquarePen, Search, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────

const rowCls =
  "flex w-full items-center gap-[5px] text-left text-sm text-th-fg transition hover:text-th-accent";
const iconCls = "h-6 w-6 shrink-0 text-th-fg-m";

// ─── Types ───────────────────────────────────────────────────────────

interface SidebarNavProps {
  newLabel: string;
  onNew: () => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onFolders: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

/** Primary sidebar actions: new chat, inline chat search, folders */
export function SidebarNav({
  newLabel,
  onNew,
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  onFolders,
}: SidebarNavProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // While searching on mobile every pixel goes to the results list
  const secondaryCls = searchOpen ? "hidden md:flex" : "";

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  function closeSearch() {
    onSearchQueryChange("");
    onSearchOpenChange(false);
  }

  return (
    <nav className="flex shrink-0 flex-col gap-[10px] pl-[23px] pr-5 pt-[26px]">
      <button onClick={onNew} className={cn(rowCls, secondaryCls)} data-testid="nav-new-chat">
        <SquarePen className={iconCls} strokeWidth={1.5} />
        {newLabel}
      </button>

      {searchOpen ? (
        <div className="flex w-full items-center gap-[5px]">
          <Search className={iconCls} strokeWidth={1.5} />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            placeholder="Искать чаты"
            data-testid="chat-search-input"
            className="min-w-0 flex-1 bg-transparent text-sm text-th-fg placeholder-th-fg-f outline-none"
          />
          <button
            onClick={closeSearch}
            aria-label="Закрыть поиск"
            className="shrink-0 text-th-fg-m transition hover:text-th-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onSearchOpenChange(true)}
          className={rowCls}
          data-testid="nav-search-chats"
        >
          <Search className={iconCls} strokeWidth={1.5} />
          Искать чаты
        </button>
      )}

      <button onClick={onFolders} className={cn(rowCls, secondaryCls)} data-testid="nav-folders">
        <Folder className={iconCls} strokeWidth={1.5} />
        Папки
      </button>
    </nav>
  );
}
