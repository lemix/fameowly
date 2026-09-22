import type { MessageData, MessageGrounding } from "@/lib/types";

/** Build API message array from messages */
export function buildApiMessages(msgs: MessageData[]) {
  return msgs.map((m) => ({
    id: m.id, role: m.role, content: m.content, attachments: m.attachments,
  }));
}

/** Accumulated state of an in-flight assistant reply */
export interface StreamAccumulator {
  text: string;
  reasoning: string;
  error: string;
  grounding?: MessageGrounding;
}

/** Process a single SSE event, updating accumulated text/reasoning/grounding */
export function processStreamEvent(
  event: { type: string; [key: string]: unknown },
  acc: StreamAccumulator,
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
    case "message-metadata": {
      // Grounding arrives on a side channel and must never be merged into content
      const meta = event.messageMetadata as { grounding?: MessageGrounding } | undefined;
      if (!meta?.grounding) break;
      acc.grounding = meta.grounding;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { ...last, grounding: acc.grounding };
        return updated;
      });
      break;
    }
    case "error":
      acc.error = (event.errorText as string) || "Неизвестная ошибка";
      break;
  }
}
