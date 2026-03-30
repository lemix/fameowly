"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Loader2,
  ChevronDown,
  Sparkles,
  Trash2,
  ImageIcon,
  Paperclip,
  X,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDER_COLORS } from "@/lib/models";
import type { ChatAttachment, Mode } from "@/lib/types";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import { ASPECT_RATIOS, RESOLUTIONS } from "@/lib/constants/image-options";
import Sidebar from "@/components/sidebar";
import { ConfirmModal } from "@/components/confirm-modal";
import { ImagePreviewModal } from "@/components/image-preview-modal";
import { usePersistentChat } from "@/hooks/use-persistent-chat";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { useImageHistory } from "@/hooks/use-image-history";
import { useModels } from "@/hooks/use-models";
import { ChatView } from "@/app/(chat)/_components/chat-view";

// Types, constants, and SSE parser imported from lib/
// Hooks imported from hooks/

// ─── Main Component ──────────────────────────────────────────────────

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900 text-white"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Hooks ─────────────────────────────────────────────────────
  const {
    chatModels, imageModels,
    selectedModel, setSelectedModel,
    selectedImageModel, setSelectedImageModel,
  } = useModels();

  const { imageHistory, loadImageHistory } = useImageHistory();

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "image" ? "image" : "chat"
  );
  const [selectedPresetId, setSelectedPresetId] = useState("default");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [showSystemPromptPanel, setShowSystemPromptPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [input, setInput] = useState("");
  const [reasoningEnabled, setReasoningEnabled] = useState(true);
  const [temperature, setTemperature] = useState(0.6);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    status,
    error: chatError,
    activeChatId,
    chatList,
    chatSystemPrompt,
    setChatSystemPrompt,
    sendMessage,
    stop,
    retry,
    deleteMessage,
    deleteLastExchange,
    clearChat,
    loadChatList,
    loadChat,
    createNewChat,
    deleteChat,
    renameChat,
    updateSystemPrompt,
  } = usePersistentChat();

  const isLoading = status === "streaming" || status === "submitted";
  const isLocalModel = selectedModel.provider === "local";

  // Derive reasoning phase: streaming + last assistant msg has reasoning but no content
  const isReasoningPhase = status === "streaming" && (() => {
    const last = messages[messages.length - 1];
    return last?.role === "assistant" && !!last.reasoning && !last.content;
  })();

  // ─── Helper: compute current system prompt ──────────────────────
  const currentSystemPrompt = selectedPresetId === "custom"
    ? customSystemPrompt
    : SYSTEM_PROMPT_PRESETS.find((p) => p.id === selectedPresetId)?.prompt || SYSTEM_PROMPT_PRESETS[0].prompt;

  // ─── Route sync: read URL on mount ─────────────────────────────
  const initialRouteLoaded = useRef(false);
  useEffect(() => {
    if (initialRouteLoaded.current) return;
    initialRouteLoaded.current = true;

    const chatId = searchParams.get("chat");
    if (chatId) {
      loadChat(chatId);
    }
  }, [searchParams, loadChat]);

  // ─── Route sync: push URL on state change ──────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (mode === "image") params.set("mode", "image");
    if (mode === "chat" && activeChatId) params.set("chat", activeChatId);
    const newUrl = params.toString() ? `/?${params.toString()}` : "/";
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [mode, activeChatId, router]);

  // ─── Sync system prompt preset when loading a chat ──────────────
  useEffect(() => {
    if (!chatSystemPrompt) {
      setSelectedPresetId("default");
      setCustomSystemPrompt("");
      return;
    }
    const matched = SYSTEM_PROMPT_PRESETS.find(
      (p) => p.id !== "custom" && p.prompt === chatSystemPrompt
    );
    if (matched) {
      setSelectedPresetId(matched.id);
      setCustomSystemPrompt("");
    } else {
      setSelectedPresetId("custom");
      setCustomSystemPrompt(chatSystemPrompt);
    }
  }, [chatSystemPrompt]);

  // Load chats on mount
  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  // ─── File Upload & Image Hooks ─────────────────────────────────
  const {
    pendingAttachments, setPendingAttachments,
    imageRefAttachments, setImageRefAttachments,
    addFiles, removeAttachment,
    addImageRefFiles, removeImageRefAttachment,
  } = useFileUpload(mode);

  const {
    imagePrompt, setImagePrompt,
    imageUrl, setImageUrl,
    imageLoading, imageError, setImageError,
    imageAspectRatio, setImageAspectRatio,
    imageResolution, setImageResolution,
    selectedImageItem, setSelectedImageItem,
    confirmDeleteImageId, setConfirmDeleteImageId,
    previewImage, setPreviewImage,
    handleImageGenerate, deleteImageHistoryItem,
  } = useImageGeneration({
    selectedImageModel,
    imageRefAttachments,
    setImageRefAttachments,
    loadImageHistory,
  });

  // ─── Handlers ──────────────────────────────────────────────────

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const attachments: ChatAttachment[] = pendingAttachments
      .filter((pa) => pa.uploaded)
      .map((pa) => pa.uploaded!);

    // Pass system prompt only when starting a new chat (no messages yet)
    const sp = messages.length === 0 ? currentSystemPrompt : undefined;
    const localOpts = isLocalModel ? { temperature, reasoningEnabled } : undefined;
    sendMessage(input, selectedModel, attachments.length ? attachments : undefined, sp, localOpts);
    setInput("");
    setPendingAttachments([]);
  }

  function handleNewChat() {
    clearChat();
    setSelectedPresetId("default");
    setCustomSystemPrompt("");
    setShowSystemPromptPanel(false);
    setSidebarOpen(false);
  }

  function handleSelectChat(chatId: string) {
    loadChat(chatId);
    setMode("chat");
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white" ref={chatContainerRef}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={mode}
        onModeChange={setMode}
        chatModels={chatModels}
        imageModels={imageModels}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        selectedImageModel={selectedImageModel}
        onImageModelChange={setSelectedImageModel}
        chats={chatList}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        showAllChats={showAllChats}
        onToggleAllChats={() => setShowAllChats(!showAllChats)}
        imageHistory={imageHistory}
        activeImageId={selectedImageItem?.id || null}
        onSelectImageItem={(item) => {
          setSelectedImageItem(item);
          setImageUrl(item.imageUrl);
          setImageError("");
          setSidebarOpen(false);
        }}
        onDeleteImageHistory={deleteImageHistoryItem}
        onNewImageGeneration={() => {
          setSelectedImageItem(null);
          setImageUrl(null);
          setImageError("");
        }}
      />

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-700/40 px-4 py-2.5 md:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div
              className={`h-2 w-2 rounded-full ${
                PROVIDER_COLORS[(mode === "chat" ? selectedModel : selectedImageModel).provider]
              }`}
            />
            <span>{mode === "chat" ? selectedModel.name : selectedImageModel.name}</span>
            {isLoading && (
              <span className="ml-2 flex items-center gap-1 text-xs text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {status === "submitted" ? "Подключение..." : "Генерация..."}
              </span>
            )}
          </div>
          <div className="w-9 md:hidden" />
        </header>

        {/* Chat Mode */}
        {mode === "chat" && (
          <ChatView
            messages={messages}
            status={status}
            error={chatError}
            chatSystemPrompt={chatSystemPrompt}
            isLoading={isLoading}
            isReasoningPhase={isReasoningPhase}
            input={input}
            onInputChange={setInput}
            onSubmit={handleChatSubmit}
            onStop={stop}
            onDeleteMessage={deleteMessage}
            onRetry={() => retry(selectedModel, isLocalModel ? { temperature, reasoningEnabled } : undefined)}
            onDeleteLastExchange={deleteLastExchange}
            onUpdateSystemPrompt={updateSystemPrompt}
            pendingAttachments={pendingAttachments}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
            customSystemPrompt={customSystemPrompt}
            onCustomPromptChange={setCustomSystemPrompt}
            showSystemPromptPanel={showSystemPromptPanel}
            onShowPanelChange={setShowSystemPromptPanel}
            isLocalModel={isLocalModel}
            reasoningEnabled={reasoningEnabled}
            onReasoningToggle={() => {
              const next = !reasoningEnabled;
              setReasoningEnabled(next);
              setTemperature(next ? 0.6 : 0.7);
            }}
            temperature={temperature}
            onTemperatureChange={setTemperature}
          />
        )}

        {/* Image Mode */}
        {mode === "image" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-8">
              <div className="mx-auto w-full max-w-xl">

              {/* ── History View: show selected image ─────────── */}
              {selectedImageItem && selectedImageItem.imageUrl && (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImageItem.imageUrl}
                      alt={selectedImageItem.prompt}
                      className="w-full cursor-pointer transition hover:opacity-90"
                      onClick={() => setPreviewImage(selectedImageItem.imageUrl)}
                    />
                    <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-3">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedImageItem.prompt}
                      </p>
                      {/* Reference files used in generation */}
                      {selectedImageItem.referenceFiles && selectedImageItem.referenceFiles.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <span className="text-[10px] text-slate-500 w-full mb-0.5">Файлы контекста:</span>
                          {selectedImageItem.referenceFiles.map((ref, i) => (
                            ref.mimeType.startsWith("image/") ? (
                              <button
                                key={i}
                                onClick={() => setPreviewImage(ref.url)}
                                className="group/ref relative cursor-pointer"
                                title={ref.name}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ref.url}
                                  alt={ref.name}
                                  className="h-12 w-12 rounded-lg object-cover border border-slate-600 transition group-hover/ref:border-blue-500 group-hover/ref:opacity-80"
                                />
                              </button>
                            ) : (
                              <a
                                key={i}
                                href={ref.url}
                                download={ref.name}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:border-blue-500 hover:text-blue-400"
                                title={`Скачать ${ref.name}`}
                              >
                                <Download className="h-3 w-3" />
                                <span className="max-w-[80px] truncate">{ref.name}</span>
                              </a>
                            )
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{selectedImageItem.modelName}</span>
                          <span>•</span>
                          {selectedImageItem.aspectRatio && (
                            <>
                              <span>{selectedImageItem.aspectRatio}</span>
                              <span>•</span>
                            </>
                          )}
                          {selectedImageItem.resolution && (
                            <>
                              <span>{selectedImageItem.resolution}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            {selectedImageItem.createdAt.toLocaleString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={selectedImageItem.imageUrl}
                            download={`image-${selectedImageItem.id}.png`}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-400 transition cursor-pointer hover:bg-slate-700 hover:text-white"
                            title="Скачать"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Скачать
                          </a>
                          <button
                            onClick={() => setConfirmDeleteImageId(selectedImageItem.id)}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-400 transition cursor-pointer hover:bg-red-500/10 hover:text-red-400"
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA to create new generation */}
                  <div className="mt-6 flex flex-col items-center gap-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedImageItem(null);
                        setImageUrl(null);
                        setImageError("");
                      }}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      <Sparkles className="h-4 w-4" />
                      Создать новое изображение
                    </button>
                    <p className="text-xs text-slate-500">
                      Или выберите другое изображение в истории
                    </p>
                  </div>
                </>
              )}

              {/* ── Generation View: empty state / loading ────── */}
              {!selectedImageItem && !imageLoading && !imageError && (
                <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
                    <ImageIcon className="h-7 w-7 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white md:text-xl">
                      <ImageIcon className="mr-2 inline h-5 w-5 text-blue-400 md:h-6 md:w-6" />
                      Генерация изображений
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Введите описание и нажмите «Создать»
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Можно прикрепить до 10 файлов или вставить через Ctrl+V
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {imageLoading && (
                <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                  <p className="text-sm text-slate-400">Генерация изображения...</p>
                </div>
              )}
              </div>
            </div>

            {/* Input area pinned to bottom — only in generation mode */}
            {!selectedImageItem && (
            <div className="relative px-3 pb-4 pt-2 md:px-4">
              {/* Gradient fade above input */}
              <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />

              <div className="mx-auto w-full max-w-xl rounded-2xl bg-slate-800/80 shadow-lg shadow-black/20 ring-1 ring-slate-700/50">
                {/* Reference files preview */}
                {imageRefAttachments.length > 0 && (
                  <div className="px-3 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {imageRefAttachments.map((pa, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-lg bg-slate-700/60 p-1"
                        >
                          {pa.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pa.preview}
                              alt={pa.file.name}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-700 text-[10px] text-slate-400">
                              {pa.file.name.split(".").pop()?.toUpperCase() || "FILE"}
                            </div>
                          )}
                          {pa.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            </div>
                          )}
                          <button
                            onClick={() => removeImageRefAttachment(idx)}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-slate-300 hover:bg-red-500 hover:text-white transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      Файлы для контекста ({imageRefAttachments.length}/10)
                    </span>
                  </div>
                )}

                {/* Input row */}
                <form onSubmit={handleImageGenerate} className="flex items-end gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition cursor-pointer hover:text-white hover:bg-slate-700/60"
                    title="Прикрепить файлы"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.json,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        addImageRefFiles(Array.from(e.target.files));
                      }
                      e.target.value = "";
                    }}
                  />

                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Опишите изображение..."
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleImageGenerate(e as unknown as React.FormEvent);
                      }
                    }}
                    className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 outline-none"
                    style={{ maxHeight: "140px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = target.scrollHeight + "px";
                    }}
                  />
                  <button
                    type="submit"
                    disabled={imageLoading || !imagePrompt.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 transition cursor-pointer hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Создать"
                  >
                    {imageLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </button>
                </form>

                {/* Compact settings row — scrollable on mobile */}
                <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2.5 scrollbar-none">
                  <div className="flex shrink-0 items-center gap-1.5">
                   <div className="flex gap-0.5">
                      {ASPECT_RATIOS.map((ar) => (
                        <button
                          key={ar.id}
                          type="button"
                          onClick={() => setImageAspectRatio(ar.id)}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition",
                            imageAspectRatio === ar.id
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:text-white hover:bg-slate-700/60"
                          )}
                        >
                          {ar.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-3 w-px shrink-0 bg-slate-700/60" />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {RESOLUTIONS.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setImageResolution(r.id)}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition",
                            imageResolution === r.id
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:text-white hover:bg-slate-700/60"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {imageError && (
                <div className="mx-auto mt-2 max-w-xl rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {imageError}
                </div>
              )}
            </div>
            )}

            {/* Image preview modal */}
            <ImagePreviewModal
              open={previewImage !== null}
              src={previewImage || ""}
              onClose={() => setPreviewImage(null)}
            />

            {/* Delete confirmation modal */}
            <ConfirmModal
              open={confirmDeleteImageId !== null}
              title="Удалить изображение?"
              message="Изображение и его история будут удалены без возможности восстановления."
              confirmLabel="Удалить"
              variant="danger"
              onConfirm={() => {
                if (confirmDeleteImageId) deleteImageHistoryItem(confirmDeleteImageId);
                setConfirmDeleteImageId(null);
              }}
              onCancel={() => setConfirmDeleteImageId(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
