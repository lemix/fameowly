"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { AppHeader } from "@/components/app-header";
import { ChatView } from "@/app/(chat)/_components/chat-view";
import { ImageView } from "@/app/(image)/_components/image-view";
import { VideoView } from "@/app/(video)/_components/video-view";
import { ChatErrorBoundary } from "@/components/chat-error-boundary";
import { usePageState } from "@/hooks/use-page-state";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { useTheme } from "@/hooks/use-theme";

// ─── Main Component ──────────────────────────────────────────────────

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center bg-th-page text-th-fg"><Loader2 className="h-6 w-6 animate-spin text-th-accent" /></div>}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const s = usePageState();
  const { viewportHeight, isKeyboardOpen } = useVisualViewport();
  const { mode: themeMode, cycleTheme } = useTheme();

  // When the mobile keyboard is open, constrain the container to the
  // visual viewport so the header stays visible (iOS Safari fallback;
  // on Android Chrome, interactiveWidget: resizes-content handles it).
  const containerHeight =
    isKeyboardOpen && viewportHeight ? `${viewportHeight}px` : "100dvh";

  return (
    <div className="flex bg-th-page text-th-fg safe-area-top" style={{ height: containerHeight }}>
      <Sidebar
        isOpen={s.sidebarOpen}
        onClose={() => s.setSidebarOpen(false)}
        mode={s.mode}
        onModeChange={s.setMode}
        chats={s.chatList}
        activeChatId={s.activeChatId}
        onSelectChat={s.handleSelectChat}
        onNewChat={s.handleNewChat}
        onDeleteChat={s.deleteChat}
        onRenameChat={s.renameChat}

        imageHistory={s.imageHistory}
        activeImageId={s.selectedImageItem?.id || null}
        onSelectImageItem={s.handleSelectImageItem}
        onDeleteImageHistory={s.deleteImageHistoryItem}
        onNewImageGeneration={s.handleNewImageGeneration}
      />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <AppHeader
          mode={s.mode}
          selectedModel={s.selectedModel}
          selectedImageModel={s.selectedImageModel}
          chatModels={s.chatModels}
          imageModels={s.imageModels}
          onModelChange={s.setSelectedModel}
          onImageModelChange={s.setSelectedImageModel}
          isLoading={s.isLoading}
          status={s.status}
          onToggleSidebar={() => s.setSidebarOpen(!s.sidebarOpen)}
          modelUnavailable={s.modelUnavailable}
          themeMode={themeMode}
          onCycleTheme={cycleTheme}
          chatId={s.activeChatId}
        />

        <ChatErrorBoundary>
          {s.mode === "chat" && (
            <ChatView
              messages={s.messages}
              status={s.status}
              error={s.error}
              chatSystemPrompt={s.chatSystemPrompt}
              isLoading={s.isLoading}
              isReasoningPhase={s.isReasoningPhase}
              input={s.input}
              onInputChange={s.setInput}
              onSubmit={s.handleChatSubmit}
              onStop={s.stop}
              onDeleteMessage={s.deleteMessage}
              onRetry={() => s.retry(s.selectedModel, s.supportsTemperature || s.supportsReasoning ? { temperature: s.temperature, reasoningEnabled: s.reasoningEnabled } : undefined)}
              onDeleteLastExchange={s.deleteLastExchange}
              onUpdateSystemPrompt={s.updateSystemPrompt}
              pendingAttachments={s.pendingAttachments}
              onAddFiles={s.addFiles}
              onRemoveAttachment={s.removeAttachment}
              onRetryAttachment={s.retryAttachment}
              selectedPresetId={s.selectedPresetId}
              onSelectPreset={s.setSelectedPresetId}
              customSystemPrompt={s.customSystemPrompt}
              onCustomPromptChange={s.setCustomSystemPrompt}
              showSystemPromptPanel={s.showSystemPromptPanel}
              onShowPanelChange={s.setShowSystemPromptPanel}
              supportsTemperature={s.supportsTemperature}
              supportsReasoning={s.supportsReasoning}
              reasoningEnabled={s.reasoningEnabled}
              onReasoningToggle={s.handleReasoningToggle}
              temperature={s.temperature}
              onTemperatureChange={s.setTemperature}
              modelUnavailable={s.modelUnavailable}
              isKeyboardOpen={isKeyboardOpen}
              chatId={s.activeChatId}
            />
          )}

          {s.mode === "image" && (
            <ImageView
              selectedItem={s.selectedImageItem}
              imageLoading={s.imageLoading}
              imageError={s.imageError}
              imagePrompt={s.imagePrompt}
              onPromptChange={s.setImagePrompt}
              onGenerate={s.handleImageGenerate}
              onDelete={s.deleteImageHistoryItem}
              onNewGeneration={s.handleNewImageGeneration}
              refAttachments={s.imageRefAttachments}
              onAddRefFiles={s.addImageRefFiles}
              onRemoveRefAttachment={s.removeImageRefAttachment}
              aspectRatio={s.imageAspectRatio}
              onAspectRatioChange={s.setImageAspectRatio}
              resolution={s.imageResolution}
              onResolutionChange={s.setImageResolution}
              previewImage={s.previewImage}
              onPreviewChange={s.setPreviewImage}
              confirmDeleteId={s.confirmDeleteImageId}
              onConfirmDeleteChange={s.setConfirmDeleteImageId}
            />
          )}

          {s.mode === "video" && <VideoView />}
        </ChatErrorBoundary>
      </main>
    </div>
  );
}

