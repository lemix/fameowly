"use client";

import { useCallback, useState } from "react";
import type { ChatSession } from "@/lib/types";
import { chatFileName, chatToMarkdown } from "@/lib/chat-export";

/**
 * Chat export entry points.
 * PDF goes through the print view — the browser's own print engine keeps the
 * text selectable and the markdown rendering identical to the chat itself.
 */
export function useChatExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback((chatId: string) => {
    window.open(`/print/${encodeURIComponent(chatId)}?autoprint=1`, "_blank", "noopener");
  }, []);

  const exportMarkdown = useCallback(async (chatId: string) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/chats?id=${encodeURIComponent(chatId)}`);
      if (!res.ok) throw new Error(`Не удалось загрузить чат: ${res.status}`);

      const { chat } = (await res.json()) as { chat: ChatSession };
      const url = URL.createObjectURL(
        new Blob([chatToMarkdown(chat)], { type: "text/markdown;charset=utf-8" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = chatFileName(chat.title, "md");
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking in the same tick can abort the download that just started
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      console.error("Markdown export failed:", err);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportPdf, exportMarkdown, exporting };
}
