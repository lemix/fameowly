"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import type { MessageData, ChatStatus, PendingAttachment, SystemPromptPreset } from "@/lib/types";
import { ChatMessage } from "@/components/chat-message/chat-message";
import { ChatEmptyState } from "./chat-empty-state";
import { SystemPromptDisplay } from "./system-prompt-display";
import { ThinkingIndicator } from "./thinking-indicator";
import { ChatErrorBanner } from "./chat-error-banner";
import { ChatInput } from "./chat-input";
import { ModePanel } from "./mode-panel";
import { useLazyMessages } from "@/hooks/use-lazy-messages";
import { useSmartScroll } from "@/hooks/use-smart-scroll";
import { useModePanelVisibility } from "@/hooks/use-mode-panel-visibility";

interface ChatViewProps {
  messages: MessageData[];
  status: ChatStatus;
  error: string | null;
  chatSystemPrompt: string | undefined;
  isLoading: boolean;
  isReasoningPhase: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  onDeleteMessage: (messageId: string) => void;
  onRetry: () => void;
  onDeleteLastExchange: () => void;
  onUpdateSystemPrompt: (prompt: string) => void;
  pendingAttachments: PendingAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  customSystemPrompt: string;
  onCustomPromptChange: (value: string) => void;
  showSystemPromptPanel: boolean;
  onShowPanelChange: (show: boolean) => void;
  supportsTemperature: boolean;
  supportsReasoning: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  modelUnavailable?: boolean;
  isKeyboardOpen: boolean;
  chatId: string | null;
}
export function ChatView({
  messages, status, error, chatSystemPrompt,
  isLoading, isReasoningPhase,
  input, onInputChange, onSubmit, onStop,
  onDeleteMessage, onRetry, onDeleteLastExchange, onUpdateSystemPrompt,
  pendingAttachments, onAddFiles, onRemoveAttachment,
  selectedPresetId, onSelectPreset, customSystemPrompt, onCustomPromptChange,
  showSystemPromptPanel, onShowPanelChange,
  supportsTemperature, supportsReasoning,
  reasoningEnabled, onReasoningToggle,
  temperature, onTemperatureChange,
  modelUnavailable,
  isKeyboardOpen,
  chatId,
}: ChatViewProps) {
  const isStreaming = status === "streaming" || status === "submitted";
  const prevVisibleCountRef = useRef(0);
  const [inputFocused, setInputFocused] = useState(false);

  // Input is "active" when user is preparing a prompt
  const inputActive = inputFocused || input.trim().length > 0 || pendingAttachments.length > 0;

  // Task 1: Lazy messages (reverse infinite scroll)
  const { visibleMessages, hasMore, loadMore } = useLazyMessages({ messages });

  // Task 2: Smart auto-scroll
  const { containerRef, handleScroll, saveScrollAnchor, restoreScrollAnchor } = useSmartScroll({
    isStreaming,
    chatId,
  });

  // Mode panel scroll-based visibility
  const { isVisible: isPanelVisible } = useModePanelVisibility({
    scrollContainerRef: containerRef,
    isEmpty: messages.length === 0,
    inputActive,
  });

  const handleLoadMore = useCallback(() => {
    saveScrollAnchor();
    loadMore();
    requestAnimationFrame(() => restoreScrollAnchor());
  }, [saveScrollAnchor, loadMore, restoreScrollAnchor]);

  if (prevVisibleCountRef.current !== 0 && visibleMessages.length > prevVisibleCountRef.current && hasMore) {
    /* Messages were prepended — anchor will be restored via handleLoadMore */
  }
  prevVisibleCountRef.current = visibleMessages.length;

  const showThinking = status === "submitted" && messages[messages.length - 1]?.role !== "assistant";

  return (
    <>
      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="chat-scroll flex-1 overflow-y-auto px-3 py-4 md:px-4"
      >
        <div className="flex min-h-full flex-col">
        {messages.length === 0 && !error && (
          <ChatEmptyState
            presets={SYSTEM_PROMPT_PRESETS}
            selectedPresetId={selectedPresetId}
            onSelectPreset={onSelectPreset}
            customSystemPrompt={customSystemPrompt}
            onCustomPromptChange={onCustomPromptChange}
            showPanel={showSystemPromptPanel}
            onShowPanelChange={onShowPanelChange}
          />
        )}

        <div className="mx-auto w-full max-w-4xl">
          {/* Load more button (reverse infinite scroll) */}
          {hasMore && (
            <div className="flex justify-center mb-4">
              <button
                onClick={handleLoadMore}
                className="flex items-center gap-1.5 rounded-full bg-th-panel px-4 py-2 text-xs font-medium text-th-fg-m ring-1 ring-th-ring/50 transition hover:bg-th-subtle hover:text-th-fg-s"
                data-testid="load-more-messages"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Загрузить ранние сообщения
              </button>
            </div>
          )}

          {visibleMessages.length > 0 && chatSystemPrompt && !hasMore && (
            <SystemPromptDisplay
              systemPrompt={chatSystemPrompt}
              onSave={onUpdateSystemPrompt}
            />
          )}

          {visibleMessages.map((m, idx) => (
            <ChatMessage
              key={m.id}
              message={m}
              isLoading={status === "submitted" && idx === visibleMessages.length - 1}
              isStreaming={status === "streaming" && idx === visibleMessages.length - 1}
              isReasoning={isReasoningPhase && idx === visibleMessages.length - 1}
              onDelete={onDeleteMessage}
            />
          ))}

          {showThinking && <ThinkingIndicator />}

          {error && !isLoading && (
            <ChatErrorBanner
              error={error}
              onRetry={onRetry}
              onDeleteLastExchange={onDeleteLastExchange}
            />
          )}
        </div>

        {/* Scroll anchor element */}
        {messages.length > 0 && <div className="shrink-0" style={{ height: 1 }} />}
        </div>
      </div>

      {/* Input area with floating mode panel */}
      <div className="relative shrink-0">
        <ModePanel
          isVisible={isPanelVisible}
          isKeyboardOpen={isKeyboardOpen}
          supportsTemperature={supportsTemperature}
          supportsReasoning={supportsReasoning}
          reasoningEnabled={reasoningEnabled}
          onReasoningToggle={onReasoningToggle}
          temperature={temperature}
          onTemperatureChange={onTemperatureChange}
        />
        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          onStop={onStop}
          isLoading={isLoading}
          disabled={modelUnavailable}
          disabledPlaceholder="Выберите новую модель для продолжения общения"
          pendingAttachments={pendingAttachments}
          onAddFiles={onAddFiles}
          onRemoveAttachment={onRemoveAttachment}
          onFocusChange={setInputFocused}
        />
      </div>
    </>
  );
}
