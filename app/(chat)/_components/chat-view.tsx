"use client";

import { useRef, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { SYSTEM_PROMPT_PRESETS } from "@/lib/constants/system-prompts";
import type { MessageData, ChatStatus, PendingAttachment, SystemPromptPreset } from "@/lib/types";
import { ChatMessage } from "@/components/chat-message/chat-message";
import { ChatEmptyState } from "./chat-empty-state";
import { SystemPromptDisplay } from "./system-prompt-display";
import { ThinkingIndicator } from "./thinking-indicator";
import { ChatErrorBanner } from "./chat-error-banner";
import { ChatInput } from "./chat-input";
import { useLazyMessages } from "@/hooks/use-lazy-messages";
import { useSmartScroll } from "@/hooks/use-smart-scroll";

interface ChatViewProps {
  messages: MessageData[];
  status: ChatStatus;
  error: string | null;
  chatSystemPrompt: string | undefined;
  isLoading: boolean;
  isReasoningPhase: boolean;
  // Input
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  // Message actions
  onDeleteMessage: (messageId: string) => void;
  onRetry: () => void;
  onDeleteLastExchange: () => void;
  onUpdateSystemPrompt: (prompt: string) => void;
  // Attachments
  pendingAttachments: PendingAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  // Preset selection
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  customSystemPrompt: string;
  onCustomPromptChange: (value: string) => void;
  showSystemPromptPanel: boolean;
  onShowPanelChange: (show: boolean) => void;
  // Model capabilities (Task 3)
  supportsTemperature: boolean;
  supportsReasoning: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  // Model availability
  modelUnavailable?: boolean;
}

/** Chat mode orchestrator — messages list, input, system prompt, errors */
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
}: ChatViewProps) {
  const isStreaming = status === "streaming" || status === "submitted";
  const prevVisibleCountRef = useRef(0);

  // Task 1: Lazy messages (reverse infinite scroll)
  const { visibleMessages, hasMore, loadMore } = useLazyMessages({ messages });

  // Task 2: Smart auto-scroll
  const { containerRef, handleScroll, saveScrollAnchor, restoreScrollAnchor } = useSmartScroll({
    isStreaming,
    messageCount: visibleMessages.length,
  });

  // Load more with scroll anchoring
  const handleLoadMore = useCallback(() => {
    saveScrollAnchor();
    loadMore();
    // Restore after DOM update
    requestAnimationFrame(() => restoreScrollAnchor());
  }, [saveScrollAnchor, loadMore, restoreScrollAnchor]);

  // Track visible count changes for scroll anchoring on lazy load
  if (prevVisibleCountRef.current !== 0 && visibleMessages.length > prevVisibleCountRef.current && hasMore) {
    // Messages were prepended — anchor will be restored via handleLoadMore
  }
  prevVisibleCountRef.current = visibleMessages.length;

  const showThinking =
    status === "submitted" &&
    messages[messages.length - 1]?.role !== "assistant";

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
                className="flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-xs font-medium text-slate-400 ring-1 ring-slate-700/50 transition hover:bg-slate-700 hover:text-slate-300"
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

      {/* Input area */}
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
        supportsTemperature={supportsTemperature}
        supportsReasoning={supportsReasoning}
        reasoningEnabled={reasoningEnabled}
        onReasoningToggle={onReasoningToggle}
        temperature={temperature}
        onTemperatureChange={onTemperatureChange}
      />
    </>
  );
}
