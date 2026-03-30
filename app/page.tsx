"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { PROVIDER_COLORS } from "@/lib/models";
import type { ChatAttachment, Mode } from "@/lib/types";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import Sidebar from "@/components/sidebar";
import { usePersistentChat } from "@/hooks/use-persistent-chat";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { useImageHistory } from "@/hooks/use-image-history";
import { useModels } from "@/hooks/use-models";
import { ChatView } from "@/app/(chat)/_components/chat-view";
import { ImageView } from "@/app/(image)/_components/image-view";

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
          <ImageView
            selectedItem={selectedImageItem}
            imageLoading={imageLoading}
            imageError={imageError}
            imagePrompt={imagePrompt}
            onPromptChange={setImagePrompt}
            onGenerate={handleImageGenerate}
            onDelete={deleteImageHistoryItem}
            onNewGeneration={() => {
              setSelectedImageItem(null);
              setImageUrl(null);
              setImageError("");
            }}
            refAttachments={imageRefAttachments}
            onAddRefFiles={addImageRefFiles}
            onRemoveRefAttachment={removeImageRefAttachment}
            aspectRatio={imageAspectRatio}
            onAspectRatioChange={setImageAspectRatio}
            resolution={imageResolution}
            onResolutionChange={setImageResolution}
            previewImage={previewImage}
            onPreviewChange={setPreviewImage}
            confirmDeleteId={confirmDeleteImageId}
            onConfirmDeleteChange={setConfirmDeleteImageId}
          />
        )}
      </main>
    </div>
  );
}
