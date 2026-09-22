import type { ChatMessageData, ChatSession } from "./types";

// ─── Constants ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<ChatMessageData["role"], string> = {
  user: "Пользователь",
  assistant: "Ассистент",
};

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMessage(message: ChatMessageData): string {
  const stamp = formatDate(message.createdAt);
  const parts = [
    `## ${ROLE_LABELS[message.role]}${stamp ? ` — ${stamp}` : ""}`,
    "",
    message.content.trim(),
  ];

  const attachments = message.attachments ?? [];
  if (attachments.length > 0) {
    parts.push("", `**Вложения:** ${attachments.map((a) => a.name).join(", ")}`);
  }

  const sources = message.grounding?.sources ?? [];
  if (sources.length > 0) {
    parts.push("", "**Источники:**");
    sources.forEach((source, idx) => {
      parts.push(`${idx + 1}. [${source.title || source.uri}](${source.uri})`);
    });
  }

  return parts.join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────

/** Serialize a chat into a self-contained Markdown document. */
export function chatToMarkdown(chat: ChatSession, modelName?: string): string {
  const head = [
    `# ${chat.title}`,
    "",
    `- **Модель:** ${modelName || chat.modelId}`,
    `- **Создан:** ${formatDate(chat.createdAt)}`,
    `- **Выгружен:** ${formatDate(new Date().toISOString())}`,
  ];

  const systemPrompt = chat.systemPrompt?.trim();
  if (systemPrompt) {
    head.push(
      "",
      "**Системный промпт:**",
      "",
      ...systemPrompt.split("\n").map((line) => `> ${line}`)
    );
  }

  const blocks = [head.join("\n"), ...chat.messages.map(renderMessage)];
  return `${blocks.join("\n\n---\n\n")}\n`;
}

/** Build a download-safe file name out of a chat title. */
export function chatFileName(title: string, ext: string): string {
  const base = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "chat"}.${ext}`;
}
