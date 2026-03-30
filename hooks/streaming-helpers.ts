import type { MessageData } from "@/lib/types";

/** Build API message array from messages */
export function buildApiMessages(msgs: MessageData[]) {
  return msgs.map((m) => ({
    id: m.id, role: m.role, content: m.content, attachments: m.attachments,
  }));
}

/** Process a single SSE event, updating accumulated text/reasoning */
export function processStreamEvent(
  event: { type: string; [key: string]: unknown },
  acc: { text: string; reasoning: string; error: string },
  setMessages: React.Dispatch<React.SetStateAction<MessageData[]>>
) {
  switch (event.type) {
    case "text-delta":
      acc.text += event.delta as string;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { ...last, content: acc.text };
        return updated;
      });
      break;
    case "reasoning-delta":
      acc.reasoning += event.delta as string;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { ...last, reasoning: acc.reasoning };
        return updated;
      });
      break;
    case "error":
      acc.error = (event.errorText as string) || "Неизвестная ошибка";
      break;
  }
}
