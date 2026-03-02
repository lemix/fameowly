"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  MessageSquare,
  ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Settings,
  LogOut,
  ChevronDown,
  History,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelOption } from "@/lib/models";
import type { ChatListItem } from "@/lib/chat-store";

// ─── Types ───────────────────────────────────────────────────────────

type Mode = "chat" | "image";

interface ImageHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string | null;
  error?: string;
  modelId: string;
  modelName: string;
  createdAt: Date;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  chatModels: ModelOption[];
  imageModels: ModelOption[];
  selectedModel: ModelOption;
  onModelChange: (model: ModelOption) => void;
  selectedImageModel: ModelOption;
  onImageModelChange: (model: ModelOption) => void;
  chats: ChatListItem[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  showAllChats: boolean;
  onToggleAllChats: () => void;
  imageHistory: ImageHistoryItem[];
  activeImageId: string | null;
  onSelectImageItem: (item: ImageHistoryItem) => void;
  onDeleteImageHistory: (id: string) => void;
}

// ─── Model Dropdown ──────────────────────────────────────────────────

function ModelDropdown({
  models,
  selected,
  onChange,
}: {
  models: ModelOption[];
  selected: ModelOption;
  onChange: (m: ModelOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2.5 text-sm text-white transition hover:border-slate-500"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              selected.provider === "google" ? "bg-green-400" : "bg-orange-400"
            )}
          />
          <span className="truncate">{selected.name}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-sm transition",
                selected.id === m.id
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-300 hover:bg-slate-700/50"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  m.provider === "google" ? "bg-green-400" : "bg-orange-400"
                )}
              />
              <span className="truncate">{m.name}</span>
              <span className="ml-auto text-[10px] text-slate-500">
                {m.provider === "google" ? "Google" : "OpenRouter"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat List Item ──────────────────────────────────────────────────

function ChatItem({
  chat,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  chat: ChatListItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSave() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== chat.title) {
      onRename(trimmed);
    } else {
      setTitle(chat.title);
    }
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-lg px-3 py-2 text-sm transition cursor-pointer",
        isActive
          ? "bg-blue-600/15 text-blue-400 border border-blue-600/25"
          : "text-slate-300 hover:bg-slate-700/40"
      )}
      onClick={() => !editing && onSelect()}
    >
      <MessageSquare className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />

      {editing ? (
        <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setTitle(chat.title);
                setEditing(false);
              }
            }}
            className="flex-1 rounded bg-slate-700 px-2 py-0.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            className="rounded p-0.5 text-green-400 hover:bg-slate-600"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setTitle(chat.title);
              setEditing(false);
            }}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate">{chat.title}</span>

          {/* Context menu */}
          <div
            ref={menuRef}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "rounded p-1 text-slate-500 transition",
                menuOpen
                  ? "bg-slate-700 text-slate-300"
                  : "opacity-40 hover:opacity-100 hover:bg-slate-700 hover:text-slate-300"
              )}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Переименовать
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────

export default function Sidebar({
  isOpen,
  onClose,
  mode,
  onModeChange,
  chatModels,
  imageModels,
  selectedModel,
  onModelChange,
  selectedImageModel,
  onImageModelChange,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  showAllChats,
  onToggleAllChats,
  imageHistory,
  activeImageId,
  onSelectImageItem,
  onDeleteImageHistory,
}: SidebarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const displayedChats = showAllChats ? chats : chats.slice(0, 8);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-700/60 bg-slate-850 transition-transform md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#0d1525" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-700/60 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Family AI Hub</span>
        </div>

        {/* Mode Tabs */}
        <div className="border-b border-slate-700/60 px-3 py-2.5">
          <div className="flex rounded-lg bg-slate-900/80 p-0.5">
            <button
              onClick={() => onModeChange("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                mode === "chat"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Чат
            </button>
            <button
              onClick={() => onModeChange("image")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                mode === "image"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Картинки
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="border-b border-slate-700/60 px-3 py-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Sparkles className="h-3 w-3" />
            {mode === "chat" ? "Модель" : "Модель для картинок"}
          </h3>
          {mode === "chat" ? (
            <ModelDropdown
              models={chatModels}
              selected={selectedModel}
              onChange={onModelChange}
            />
          ) : (
            <ModelDropdown
              models={imageModels}
              selected={selectedImageModel}
              onChange={onImageModelChange}
            />
          )}
        </div>

        {/* Chat List (only in chat mode) */}
        {mode === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* New Chat Button */}
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={onNewChat}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-400 transition hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-600/5"
              >
                <Plus className="h-4 w-4" />
                Новый чат
              </button>
            </div>

            {/* Chat items */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
              {displayedChats.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-500">
                  Нет чатов. Начните новый!
                </p>
              )}
              {displayedChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  onSelect={() => onSelectChat(chat.id)}
                  onDelete={() => onDeleteChat(chat.id)}
                  onRename={(title) => onRenameChat(chat.id, title)}
                />
              ))}
            </div>

            {/* View All toggle */}
            {chats.length > 8 && (
              <div className="border-t border-slate-700/60 px-3 py-2">
                <button
                  onClick={onToggleAllChats}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-slate-400 transition hover:text-slate-200"
                >
                  <History className="h-3.5 w-3.5" />
                  {showAllChats
                    ? "Показать недавние"
                    : `Все чаты (${chats.length})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Image mode — history */}
        {mode === "image" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                <History className="h-3 w-3" />
                История генераций
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {imageHistory.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-500">
                  Нет сгенерированных изображений
                </p>
              )}
              {imageHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectImageItem(item)}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition cursor-pointer",
                    activeImageId === item.id
                      ? "bg-blue-600/15 text-blue-400 border border-blue-600/25"
                      : "hover:bg-slate-700/40"
                  )}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-8 w-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-slate-700 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 truncate">
                      {item.prompt}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {item.modelName}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImageHistory(item.id);
                    }}
                    className="rounded p-1 text-slate-500 opacity-40 hover:opacity-100 hover:text-red-400 hover:bg-slate-700 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="border-t border-slate-700/60 p-3 space-y-1">
          <button
            onClick={() => router.push("/admin")}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Админ-панель
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
