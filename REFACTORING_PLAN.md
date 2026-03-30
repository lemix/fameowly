# Family AI Hub — Refactoring Plan

> **Цель:** привести кодовую базу в соответствие с архитектурными правилами из `.github/copilot-instructions.md`:
> макс. 200 строк на компонент, 150 строк на хук, один компонент = один файл,
> SOLID, DDD-lite, low coupling.
>
> **Последнее обновление:** 2026-03-30 — полный аудит текущего состояния.

---

## 📐 Текущее состояние (метрики)

| Файл | Строк | Лимит | Превышение |
|---|---|---|---|
| `app/page.tsx` | 1792 | 200 | **×8.9** |
| `components/sidebar.tsx` | 646 | 200 | **×3.2** |
| `components/chat-message.tsx` | 463 | 200 | **×2.3** |
| `lib/local-llm-stream.ts` | 452 | — | Серверная утилита, допустимо |
| `app/api/image/route.ts` | 306 | — | Допустимо, но содержит дублированный `resolveReferenceImage` |
| `app/api/chat/route.ts` | 282 | — | Допустимо, но содержит дублированный `resolveFileUrl` |
| `app/admin/page.tsx` | 278 | 200 | **×1.4** |
| `lib/chat-store.ts` | 240 | — | OK, но содержит `saveUploadedFile` — нарушает SRP |

### Критические проблемы

1. **`app/page.tsx` — монолит на 1792 строк:**
   - 5 inline-типов (L33–66)
   - 3 inline-массива констант (L68–112)
   - Утилита `parseSSEStream` (L116–147)
   - Хук `usePersistentChat` на ~440 строк (L151–592)
   - Wrapper `ChatPageWrapper` (L596–602)
   - Mega-компонент `ChatPage` на ~1190 строк (L604–1792): ~30 useState, 4 useRef, ~200 строк бизнес-логики, ~750 строк JSX
   - Содержит логику: upload файлов, image generation, paste handler, route sync, model loading, image history loading

2. **`components/sidebar.tsx` — 3 компонента в одном файле:**
   - `ModelAccordionDropdown` (L69–211, ~143 строк)
   - `ChatItem` (L215–370, ~156 строк)
   - `Sidebar` (L374–645, ~272 строк) — сам по себе превышает лимит

3. **`components/chat-message.tsx` — 4 компонента в одном файле:**
   - `CodeBlock` (L50–104)
   - `MarkdownContent` (L108–190)
   - `AttachmentPreview` (L194–241)
   - `ChatMessage` (L245–460, ~216 строк) — превышает лимит
   - Экспортирует `MessageData` (L30–38) — нужно перенести в `lib/types.ts`

4. **Дублирование типов:**
   - `Mode` — определён в `page.tsx` (L35) и `sidebar.tsx` (L31)
   - `ImageHistoryItem` — определён в `page.tsx` (L47–58), `sidebar.tsx` (L33–40), `lib/image-store.ts` (L7–18). Серверная версия использует `createdAt: string`, клиентские — `createdAt: Date`
   - `ChatAttachment` — определён в `lib/chat-store.ts` и повторно в `app/api/chat/route.ts` (L48–53)
   - `MessageData` — определён в `components/chat-message.tsx` (L31–39). Серверный `ChatMessageData` (chat-store.ts) использует `createdAt: string`, клиентский `MessageData` — `createdAt?: Date | string`

5. **Дублирование кода:**
   - `resolveFileUrl` — продублирована в `app/api/chat/route.ts` (L17–42) и `app/api/image/route.ts` (L27–53) как `resolveReferenceImage`. Код почти идентичный, включая inline `mimeMap`.
   - `MIME_TYPES` / `mimeMap` — определён в 3 местах: `app/api/files/[...path]/route.ts`, `app/api/chat/route.ts`, `app/api/image/route.ts`.

6. **Безопасность файлов:**
   - `saveUploadedFile` (chat-store.ts L221–239) сохраняет файлы в плоскую директорию `data/uploads/` без привязки к userId.
   - `app/api/files/[...path]/route.ts` отдаёт файлы любому авторизованному пользователю без проверки владельца.
   - Любой авторизованный пользователь может получить файл другого пользователя по UUID.
   - `resolveReferenceImage` в `app/api/image/route.ts` использует `path.join` вместо `path.resolve` — отсутствует защита от directory traversal (в отличие от `resolveFileUrl` в chat/route.ts, которая использует `path.resolve` + `startsWith` check).

7. **Мобильный viewport:**
   - Используется `h-screen` вместо `h-dvh` (page.tsx L1040).
   - Нет `dvh` fix в `globals.css`.
   - Нет `viewport-fit: cover` и `interactive-widget` в metadata (layout.tsx).
   - Нет safe-area padding для устройств с notch/home indicator.

---

## 🎯 Целевая структура после рефакторинга

```
app/
  layout.tsx                          # + viewport meta (dvh, safe-area)
  globals.css                         # + dvh fix + safe-area utilities
  page.tsx                            # ≤150 строк — orchestrator (Suspense, hooks, routing, layout)
  (chat)/
    _components/
      chat-view.tsx                   # ~180 строк — контейнер чат-режима
      chat-empty-state.tsx            # ~80 строк — пустой экран + выбор системного промпта
      chat-input.tsx                  # ~150 строк — поле ввода с файлами + local model controls
      system-prompt-display.tsx       # ~80 строк — отображение/редактирование системного промпта
      chat-error-banner.tsx           # ~40 строк — баннер ошибки с кнопками
      thinking-indicator.tsx          # ~30 строк — анимация "думаю..."
  (image)/
    _components/
      image-view.tsx                  # ~160 строк — контейнер режима картинок
      image-result.tsx                # ~120 строк — просмотр результата генерации
      image-input.tsx                 # ~140 строк — поле ввода + настройки (aspect ratio, resolution)
      image-empty-state.tsx           # ~30 строк — заглушка

components/
  app-header.tsx                      # ~60 строк — верхняя панель
  sidebar/
    sidebar.tsx                       # ~120 строк — orchestrator
    model-dropdown.tsx                # ~120 строк — accordion dropdown моделей
    chat-item.tsx                     # ~120 строк — элемент чата + context menu + confirm modal
    chat-list.tsx                     # ~60 строк — список чатов + кнопка "Новый чат"
    image-history-list.tsx            # ~80 строк — история генераций
    sidebar-footer.tsx                # ~30 строк — кнопки "Админ-панель" и "Выйти"
  chat-message/
    chat-message.tsx                  # ~120 строк — основной компонент сообщения
    code-block.tsx                    # ~50 строк — блок кода с копированием
    markdown-content.tsx              # ~80 строк — рендер markdown
    attachment-preview.tsx            # ~55 строк — превью файлов
    message-actions.tsx               # ~65 строк — кнопки под сообщением (copy, delete + confirm)
  confirm-modal.tsx                   # Без изменений (89 строк) ✓
  image-preview-modal.tsx             # Без изменений (62 строки) ✓

hooks/
  use-persistent-chat.ts             # ~80 строк — orchestrator хук
  use-chat-api.ts                    # ~140 строк — CRUD чатов
  use-chat-streaming.ts              # ~150 строк — отправка/стриминг/retry/stop (с helpers)
  use-chat-messages.ts               # ~60 строк — state сообщений
  use-file-upload.ts                 # ~130 строк — upload, add/remove attachments, paste
  use-image-generation.ts            # ~80 строк — handleImageGenerate, deleteHistoryItem
  use-image-history.ts               # ~40 строк — загрузка истории генераций
  use-models.ts                      # ~60 строк — загрузка моделей с сервера

lib/
  types.ts                           # ~80 строк — все shared типы
  constants/
    system-prompts.ts                # ~40 строк — SYSTEM_PROMPT_PRESETS
    image-options.ts                 # ~20 строк — ASPECT_RATIOS, RESOLUTIONS
  sse-parser.ts                      # ~35 строк — parseSSEStream
  file-storage.ts                    # ~80 строк — saveUploadedFile (с userId), resolveFileUrl, MIME_TYPES
  auth.ts                            # Без изменений ✓
  chat-store.ts                      # Минус saveUploadedFile → file-storage.ts
  image-store.ts                     # Без изменений ✓
  image-resize.ts                    # Без изменений ✓
  models.ts                          # Без изменений ✓
  models.server.ts                   # Без изменений ✓
  proxy-fetch.ts                     # Без изменений ✓
  local-llm-stream.ts               # Без изменений ✓
  utils.ts                           # Без изменений ✓

app/api/
  files/[...path]/route.ts           # + проверка владельца файла + backward compat
  upload/route.ts                    # + передача userId в saveUploadedFile
  chat/route.ts                      # resolveFileUrl → из lib/file-storage.ts, удалить дублирование
  image/route.ts                     # resolveReferenceImage → resolveFileUrl из lib/file-storage.ts
  chats/route.ts                     # Без изменений ✓
  images/route.ts                    # Без изменений ✓
  models/route.ts                    # Без изменений ✓
  auth/                              # Без изменений ✓
```

---

## 📋 План выполнения (8 этапов)

### Этап 1: Shared Types & Constants

**Цель:** вынести все переиспользуемые типы и константы, устранить дублирование.

#### 1.1 Создать `lib/types.ts`

Объединить все shared типы. Клиентские типы с `Date` и серверные со `string` нужно разделить — клиентские типы с `Date` останутся в `lib/types.ts`, серверные (`ChatMessageData`, `ImageHistoryItem`) останутся в своих модулях (`chat-store.ts`, `image-store.ts`).

```typescript
// lib/types.ts

export type Mode = "chat" | "image";
export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

export interface PendingAttachment {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded?: ChatAttachment;
}

export interface SystemPromptPreset {
  id: string;
  name: string;
  prompt: string;
}

/** Client-side image history item (createdAt is Date, not string) */
export interface ImageHistoryItemClient {
  id: string;
  prompt: string;
  imageUrl: string | null;
  error?: string;
  modelId: string;
  modelName: string;
  createdAt: Date;
  referenceFiles?: Array<{ url: string; name: string; mimeType: string }>;
  aspectRatio?: string;
  resolution?: string;
}

/** Client-side message (createdAt is Date | string | undefined) */
export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  error?: string;
  attachments?: ChatAttachment[];
  createdAt?: Date | string;
}

// Re-export server types for convenience.
// IMPORTANT: use `export type` (not `export`) to ensure tree-shaking —
// these modules import `fs`/`path` which must NOT be bundled into client code.
export type { ModelOption, ModelsConfig } from "./models";
export type { ChatListItem, ChatAttachment, ChatSession, ChatMessageData } from "./chat-store";
export type { ImageHistoryItem } from "./image-store";
```

> **⚠️ Проверить:** re-export из `chat-store.ts` и `image-store.ts` — эти модули импортируют `fs`/`path`. TypeScript `export type` гарантирует erasure при компиляции, но нужно убедиться, что Next.js bundler не тянет серверный код в client bundle. Если возникнут проблемы — убрать re-export и импортировать типы напрямую из `@/lib/chat-store` и `@/lib/image-store`.

**Действия:**
- Создать `lib/types.ts` с содержимым выше.
- Удалить `Mode`, `ChatStatus`, `PendingAttachment`, `ImageHistoryItem` (клиентский), `SystemPromptPreset` из `page.tsx` — заменить на импорт из `@/lib/types`.
- Удалить `Mode`, `ImageHistoryItem` из `sidebar.tsx` — заменить на импорт `Mode` и `ImageHistoryItemClient` из `@/lib/types`.
- Удалить `export interface MessageData` из `chat-message.tsx` — заменить на импорт из `@/lib/types`.
- Удалить inline `ChatAttachment` и `ApiMessage` из `app/api/chat/route.ts` — заменить на импорт `ChatAttachment` из `@/lib/chat-store` (серверный модуль).
- Обновить все `import type { MessageData } from "@/components/chat-message"` → `from "@/lib/types"`.
- Обновить sidebar: `ImageHistoryItem` → `ImageHistoryItemClient` в props и в `SidebarProps`.

#### 1.2 Создать `lib/constants/system-prompts.ts`

Перенести `SYSTEM_PROMPT_PRESETS` из `page.tsx` (L68–94).

```typescript
// lib/constants/system-prompts.ts

import type { SystemPromptPreset } from "@/lib/types";

export const SYSTEM_PROMPT_PRESETS: SystemPromptPreset[] = [
  {
    id: "default",
    name: "🤖 Общий ассистент",
    prompt: "Ты — полезный AI-ассистент в семейном хабе. Отвечай на русском языке, если пользователь пишет на русском. Будь дружелюбным и полезным.",
  },
  {
    id: "science",
    name: "🔬 Учёный / Учитель",
    prompt: "Ты — опытный учёный и преподаватель. Отвечай на вопросы по науке подробно, точно и доступным языком. Приводи примеры, аналогии и ссылки на научные факты. Если вопрос касается школьной программы — объясняй пошагово, как хороший учитель. Отвечай на русском языке, если пользователь пишет на русском.",
  },
  {
    id: "coding",
    name: "💻 Программист",
    prompt: "Ты — опытный программист-эксперт. Помогай писать код, отлаживать ошибки, объяснять алгоритмы и архитектурные решения. Пиши чистый, идиоматичный код с комментариями. Если пользователь не указал язык программирования — уточни. Отвечай на русском языке, если пользователь пишет на русском.",
  },
  {
    id: "teacher",
    name: "📚 Помощник по учёбе",
    prompt: "Ты — терпеливый помощник по учёбе для школьников и студентов. Объясняй сложные темы простым языком, приводи примеры из жизни. Помогай решать задачи пошагово, не давая сразу готовый ответ, а направляя к решению. Отвечай на русском языке.",
  },
  {
    id: "custom",
    name: "✏️ Свой промпт",
    prompt: "",
  },
];
```

#### 1.3 Создать `lib/constants/image-options.ts`

Перенести `ASPECT_RATIOS` и `RESOLUTIONS` из `page.tsx` (L98–112).

```typescript
// lib/constants/image-options.ts

export const ASPECT_RATIOS = [
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "1:1", label: "1:1" },
  { id: "3:2", label: "3:2" },
  { id: "9:16", label: "9:16" },
  { id: "3:4", label: "3:4" },
  { id: "2:3", label: "2:3" },
];

export const RESOLUTIONS = [
  { id: "1K", label: "1К" },
  { id: "2K", label: "2К" },
  { id: "4K", label: "4К" },
];
```

#### 1.4 Создать `lib/sse-parser.ts`

Перенести `parseSSEStream` из `page.tsx` (L116–147).

```typescript
// lib/sse-parser.ts

/** Parse an SSE stream from the server into typed events */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<{ type: string; [key: string]: unknown }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;
        try {
          yield JSON.parse(data);
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

**Проверка после Этапа 1:** `npm run build`. Функционал не должен измениться — только перемещение типов/констант.

---

### Этап 2: File Security (per-user isolation)

**Цель:** файлы пользователей хранятся в `data/uploads/{userId}/`, доступ проверяется по владельцу. Устранить дублирование `resolveFileUrl` / `resolveReferenceImage` / `MIME_TYPES`.

#### 2.1 Создать `lib/file-storage.ts`

Вынести из `lib/chat-store.ts` функцию `saveUploadedFile` и из `app/api/chat/route.ts` / `app/api/image/route.ts` функции `resolveFileUrl` / `resolveReferenceImage`. Добавить поддержку userId. Централизовать `MIME_TYPES`.

```typescript
// lib/file-storage.ts

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MAX_BASE64_SIZE = 512 * 1024; // 512KB — inline as base64

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
}

/** Shared MIME type map */
export const MIME_TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown",
  ".json": "application/json", ".csv": "text/csv",
};

/**
 * Save an uploaded file to the user's directory.
 * Small images → base64 data URI (inline), large files → disk.
 */
export function saveUploadedFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string
): string {
  // Small images as data URIs
  if (buffer.length <= MAX_BASE64_SIZE && mimeType.startsWith("image/")) {
    const b64 = buffer.toString("base64");
    return `data:${mimeType};base64,${b64}`;
  }

  // Save to user's directory
  const userDir = path.join(UPLOADS_DIR, userId);
  ensureDir(userDir);
  const ext = path.extname(fileName) || ".bin";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(userDir, uniqueName);
  fs.writeFileSync(filePath, buffer);
  return `/api/files/${userId}/${uniqueName}`;
}

/**
 * Resolve a file URL (/api/files/... or data:...) to raw base64 + mimeType.
 * Checks both user-scoped paths and legacy flat paths for backward compatibility.
 */
export function resolveFileUrl(
  url: string
): { data: string; mimeType: string } | null {
  try {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:(.*?);base64,(.*)$/);
      if (match) return { mimeType: match[1], data: match[2] };
      return null;
    }
    if (url.startsWith("/api/files/")) {
      const relativePath = url.replace("/api/files/", "");
      const filePath = path.resolve(UPLOADS_DIR, relativePath);
      // Security: prevent directory traversal
      if (!filePath.startsWith(UPLOADS_DIR)) return null;
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      return { data: buffer.toString("base64"), mimeType };
    }
  } catch { /* ignore */ }
  return null;
}
```

#### 2.2 Обновить `app/api/upload/route.ts`

```diff
- import { saveUploadedFile } from "@/lib/chat-store";
+ import { saveUploadedFile } from "@/lib/file-storage";

  // ... внутри POST handler:
- const url = saveUploadedFile(buffer, fileName, mimeType);
+ const url = saveUploadedFile(buffer, fileName, mimeType, session.userId);
```

#### 2.3 Обновить `app/api/files/[...path]/route.ts`

Добавить проверку владельца файла с backward compatibility:

```typescript
// Новая логика:
// URL format: /api/files/generated/{filename} — shared generated images
// URL format: /api/files/{userId}/{filename} — new per-user files
// URL format: /api/files/{filename} — legacy flat files (backward compat)

const { path: segments } = await params;
const relativePath = segments.join("/");

// Allow generated images for all authenticated users
// For user files with ≥2 segments: first segment = userId, check ownership
if (segments.length >= 2 && !relativePath.startsWith("generated/")) {
  const [fileUserId] = segments;
  if (fileUserId !== session.userId) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
}

// Resolve and serve (existing traversal protection stays)
```

Также: импортировать `MIME_TYPES` из `@/lib/file-storage` вместо дублирующего inline-объекта.

#### 2.4 Обновить `app/api/chat/route.ts`

- Удалить inline `resolveFileUrl` (L17–42) и inline `UPLOADS_DIR` (L14).
- Удалить inline `ChatAttachment` и `ApiMessage` interfaces (L44–58).
- Удалить inline `mimeMap` (L30–37) — будет использоваться `MIME_TYPES` из `lib/file-storage.ts`.
- Импортировать `{ resolveFileUrl }` из `@/lib/file-storage`.
- Импортировать `ChatAttachment` из `@/lib/chat-store`.
- Определить `ApiMessage` локально (он используется только в этом файле).

#### 2.5 Обновить `app/api/image/route.ts`

- Удалить inline `resolveReferenceImage` (L27–53).
- Импортировать `{ resolveFileUrl }` из `@/lib/file-storage`.
- Заменить все вызовы `resolveReferenceImage(url)` на `resolveFileUrl(url)`.

#### 2.6 Обновить `lib/chat-store.ts`

- Удалить `saveUploadedFile` (L221–239) и `MAX_BASE64_SIZE` (L219).
- Удалить `UPLOADS_DIR` (L48) — больше не используется.
- CRUD операции для чатов остаются без изменений.

**Проверка после Этапа 2:** `npm run build`. Протестировать:
- Загрузка нового файла → файл должен сохраниться в `data/uploads/{userId}/`.
- Доступ к старым файлам по URL `/api/files/{uuid}.ext` → должен работать.
- Доступ к файлу другого пользователя → 403.
- Генерация изображений с reference files → должна работать.

---

### Этап 3: Hooks — извлечение из page.tsx

**Цель:** `usePersistentChat` (~415 строк, L152–592) → 3 sub-хука + orchestrator. Остальная логика `ChatPage` → отдельные хуки.

#### 3.1 Создать `hooks/use-chat-api.ts` (~140 строк)

Вынести из `usePersistentChat`:
- `loadChatList` (L167–178) — загрузка списка чатов
- `loadChat` (L180–201) — загрузка конкретного чата
- `createNewChat` (L207–234) — создание нового чата
- `deleteChat` (L513–533) — удаление чата
- `renameChat` (L536–549) — переименование чата
- `updateSystemPrompt` (L553–568) — обновление системного промпта
- `persistMessages` (L237–264) — сохранение сообщений на сервер
- State: `chatList`, `activeChatId`, `chatSystemPrompt`
- Refs: `activeChatIdRef`, `messagesRef` (для предотвращения stale closures)

**⚠️ Внимание:** ~140 строк — близко к лимиту 150. Если превысит при реализации, вынести `persistMessages` в отдельный utility-хук или helper.

Возвращает:
```typescript
{
  chatList, activeChatId, chatSystemPrompt,
  setChatSystemPrompt, setActiveChatId,
  loadChatList, loadChat, createNewChat, deleteChat, renameChat,
  updateSystemPrompt, persistMessages,
  activeChatIdRef, messagesRef,
}
```

#### 3.2 Создать `hooks/use-chat-messages.ts` (~60 строк)

State-хук для массива messages:
- `messages`, `setMessages`
- `deleteMessage(messageId)` (L467–477 текущего page.tsx) — удаление одного сообщения + вызов `persistMessages`
- `deleteLastExchange()` (L479–497) — удаление последней пары user+assistant
- `clearChat()` (L499–506) — очистка всех сообщений, reset refs

Принимает через параметр:
```typescript
interface UseChatMessagesParams {
  activeChatId: string | null;
  persistMessages: (chatId: string, msgs: MessageData[]) => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  setChatSystemPrompt: (prompt: string | undefined) => void;
  activeChatIdRef: React.MutableRefObject<string | null>;
  messagesRef: React.MutableRefObject<MessageData[]>;
}
```

#### 3.3 Создать `hooks/use-chat-streaming.ts` (~150 строк)

Вынести из `usePersistentChat`:
- `sendMessage(text, model, attachments, systemPrompt, localOptions)` (L267–436) — основная логика стриминга через SSE
- `stop()` (L438–441) — прерывание стриминга
- `retry(model, localOptions)` (L443–465) — повтор последнего запроса
- State: `status`, `error`

**⚠️ Внимание:** `sendMessage` — это ~170 строк. Чтобы хук уложился в 150 строк, нужно:
- Вынести обработку SSE-событий (switch по event.type, ~30 строк) в отдельную helper-функцию `processStreamEvent` внутри файла (не хук, просто функция).
- Вынести построение `apiMessages` (~10 строк) в отдельную helper-функцию `buildApiMessages`.
- Итого: хук ~120 строк + ~30 строк helpers = файл ~150 строк.

Зависит от (передаётся через параметр):
```typescript
interface UseChatStreamingParams {
  messages: MessageData[];
  setMessages: React.Dispatch<React.SetStateAction<MessageData[]>>;
  activeChatIdRef: React.MutableRefObject<string | null>;
  messagesRef: React.MutableRefObject<MessageData[]>;
  createNewChat: (modelId: string, systemPrompt?: string) => Promise<string | null>;
  persistMessages: (chatId: string, msgs: MessageData[]) => Promise<void>;
  chatSystemPrompt: string | undefined;
}
```

Использует `parseSSEStream` из `@/lib/sse-parser`.

#### 3.4 Создать `hooks/use-persistent-chat.ts` (~80 строк)

Orchestrator-хук, который объединяет sub-хуки:

```typescript
import { useCallback } from "react";
import { useChatApi } from "./use-chat-api";
import { useChatMessages } from "./use-chat-messages";
import { useChatStreaming } from "./use-chat-streaming";

export function usePersistentChat() {
  const chatApi = useChatApi();
  const chatMessages = useChatMessages({
    activeChatId: chatApi.activeChatId,
    persistMessages: chatApi.persistMessages,
    setActiveChatId: chatApi.setActiveChatId,
    setChatSystemPrompt: chatApi.setChatSystemPrompt,
    activeChatIdRef: chatApi.activeChatIdRef,
    messagesRef: chatApi.messagesRef,
  });
  const streaming = useChatStreaming({
    messages: chatMessages.messages,
    setMessages: chatMessages.setMessages,
    activeChatIdRef: chatApi.activeChatIdRef,
    messagesRef: chatApi.messagesRef,
    createNewChat: chatApi.createNewChat,
    persistMessages: chatApi.persistMessages,
    chatSystemPrompt: chatApi.chatSystemPrompt,
  });

  const clearChat = useCallback(() => {
    chatMessages.clearChat();
  }, [chatMessages]);

  return {
    ...chatApi,
    ...chatMessages,
    ...streaming,
    clearChat,
  };
}
```

**Важно:** Интерфейс возвращаемого объекта `usePersistentChat()` должен остаться идентичным текущему (тот же набор полей), чтобы `ChatPage` не требовал изменений на этом этапе.

#### 3.5 Создать `hooks/use-file-upload.ts` (~130 строк)

Вынести из `ChatPage`:
- `uploadFile(file)` (L796–815) — POST в /api/upload, возвращает `ChatAttachment | null`
- `addFiles(files)` (L819–849) — добавление pending attachments для чата
- `removeAttachment(idx)` (L852–862) — удаление attachment
- `addImageRefFiles(files)` (L865–893) — добавление reference files для image mode
- `removeImageRefAttachment(idx)` (L896–903)
- Paste handler useEffect (L906–932) — вставка изображений из clipboard (mode-aware)
- State: `pendingAttachments`, `imageRefAttachments`

Принимает: `mode: Mode` (для paste handler, чтобы знать куда добавлять файлы).

Возвращает:
```typescript
{
  pendingAttachments, setPendingAttachments,
  imageRefAttachments, setImageRefAttachments,
  uploadFile, addFiles, removeAttachment,
  addImageRefFiles, removeImageRefAttachment,
}
```

#### 3.6 Создать `hooks/use-image-generation.ts` (~80 строк)

Вынести из `ChatPage`:
- `handleImageGenerate(e)` (L936–989) — POST в /api/image
- `deleteImageHistoryItem(id)` (L991–1008) — DELETE /api/images
- State: `imagePrompt`, `imageUrl`, `imageLoading`, `imageError`
- State: `imageAspectRatio`, `imageResolution`
- State: `selectedImageItem`, `confirmDeleteImageId`, `previewImage`

Принимает:
```typescript
interface UseImageGenerationParams {
  selectedImageModel: ModelOption;
  imageRefAttachments: PendingAttachment[];
  setImageRefAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  loadImageHistory: () => Promise<void>;
}
```

#### 3.7 Создать `hooks/use-image-history.ts` (~40 строк)

Вынести из `ChatPage`:
- `loadImageHistory` useCallback (L764–779)
- `imageHistory` state + useEffect для загрузки при mount

Возвращает: `{ imageHistory, loadImageHistory }`

#### 3.8 Создать `hooks/use-models.ts` (~60 строк)

Вынести из `ChatPage`:
- `chatModels`, `imageModels` — state (с fallback на `AVAILABLE_MODELS` / `IMAGE_MODELS` из `lib/models.ts`)
- `selectedModel`, `selectedImageModel` — state + setters
- useEffect для загрузки моделей из /api/models (L734–761)

Возвращает:
```typescript
{
  chatModels, imageModels,
  selectedModel, setSelectedModel,
  selectedImageModel, setSelectedImageModel,
}
```

**Примечание:** state `reasoningEnabled`, `temperature` и `isLocalModel` (derived: `selectedModel.provider === "local"`) остаются локальными в `ChatPage` — они нужны только для UI и не являются бизнес-логикой хуков. Будут переданы как props в `ChatView` / `ChatInput` на этапе 4.

**Проверка после Этапа 3:** `npm run build`. `ChatPage` всё ещё содержит JSX (монолитный), но вся бизнес-логика теперь в хуках. Поведение идентично.

---

### Этап 4: Компоненты чата — извлечение из page.tsx

**Цель:** JSX чат-режима (~L1082–1455 текущего page.tsx) → отдельные компоненты.

#### 4.1 Создать `app/(chat)/_components/chat-empty-state.tsx` (~80 строк)

Вынести блок empty-state с системными промптами (L1088–1138):
- Иконка Bot + приветствие «Привет! Чем могу помочь?»
- Сетка 2×N пресетов системных промптов
- Текстовое поле для кастомного промпта (показывается при `selectedPresetId === "custom"`)

```typescript
interface ChatEmptyStateProps {
  presets: SystemPromptPreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  customSystemPrompt: string;
  onCustomPromptChange: (value: string) => void;
  showPanel: boolean;
  onShowPanelChange: (show: boolean) => void;
}
```

#### 4.2 Создать `app/(chat)/_components/system-prompt-display.tsx` (~80 строк)

Вынести блок отображения/редактирования системного промпта (L1147–1211):
- Режим просмотра: кликабельный блок с иконкой Brain
- Режим редактирования: textarea + кнопки Save/Cancel

Внутренний state: `editing`, `editingText`.

```typescript
interface SystemPromptDisplayProps {
  systemPrompt: string;
  onSave: (newPrompt: string) => void;
}
```

#### 4.3 Создать `app/(chat)/_components/thinking-indicator.tsx` (~30 строк)

Вынести анимацию "Думаю..." (L1227–1247): иконка Bot + Brain + bouncing dots.

Stateless, без props.

#### 4.4 Создать `app/(chat)/_components/chat-error-banner.tsx` (~40 строк)

Вынести баннер ошибки (L1250–1280): XCircle icon, error message, кнопки "Повторить" и "Удалить".

```typescript
interface ChatErrorBannerProps {
  error: string;
  onRetry: () => void;
  onDeleteLastExchange: () => void;
}
```

#### 4.5 Создать `app/(chat)/_components/chat-input.tsx` (~150 строк)

Вынести область ввода сообщений чата (L1289–1455):
- Gradient fade div
- Pending attachments preview (thumbnails + remove buttons)
- File upload button + hidden `<input type="file">`
- Textarea с auto-resize + Enter to submit
- Send / Stop button
- **Local model controls:** reasoning toggle + temperature slider (L1401–1448)

```typescript
interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  pendingAttachments: PendingAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isLocalModel: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
}
```

#### 4.6 Создать `app/(chat)/_components/chat-view.tsx` (~180 строк)

Orchestrator для чат-режима: собирает все sub-components + messages list + auto-scroll + `messagesEndRef`.

```typescript
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  customSystemPrompt: string;
  onCustomPromptChange: (value: string) => void;
  isLocalModel: boolean;
  reasoningEnabled: boolean;
  onReasoningToggle: () => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
}
```

**Проверка после Этапа 4:** `npm run build`. Chat mode полностью декомпозирован.

---

### Этап 5: Компоненты картинок — извлечение из page.tsx

**Цель:** JSX image-режима (~L1457–1791 текущего page.tsx) → отдельные компоненты.

#### 5.1 Создать `app/(image)/_components/image-result.tsx` (~120 строк)

Вынести блок просмотра сгенерированного изображения (L1473–1583):
- `<img>` (кликабельная для превью)
- Prompt text
- Reference files: image thumbnails (кликабельные для превью) + non-image file links
- Метаданные: modelName, aspectRatio, resolution, дата
- Кнопки «Скачать» и «Удалить»
- CTA «Создать новое изображение»

```typescript
interface ImageResultProps {
  item: ImageHistoryItemClient;
  onPreview: (src: string | null) => void;
  onDelete: (id: string) => void;
  onNewGeneration: () => void;
}
```

#### 5.2 Создать `app/(image)/_components/image-empty-state.tsx` (~30 строк)

Вынести заглушку (L1592–1612): иконка ImageIcon + заголовок + описание.

Stateless, без props.

#### 5.3 Создать `app/(image)/_components/image-input.tsx` (~140 строк)

Вынести область ввода для генерации (L1622–1778):
- Gradient fade div
- Reference files preview (thumbnails + remove buttons + count label)
- File upload button + hidden `<input type="file">`
- Textarea + submit button
- Aspect ratio buttons row
- Resolution buttons row
- Error message div

```typescript
interface ImageInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  refAttachments: PendingAttachment[];
  onAddRefFiles: (files: File[]) => void;
  onRemoveRefAttachment: (idx: number) => void;
  imageFileInputRef: React.RefObject<HTMLInputElement | null>;
  aspectRatio: string;
  onAspectRatioChange: (ar: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  error: string;
}
```

#### 5.4 Создать `app/(image)/_components/image-view.tsx` (~160 строк)

Orchestrator для режима картинок: собирает sub-components + loading spinner + `ImagePreviewModal` + `ConfirmModal`.

```typescript
interface ImageViewProps {
  selectedItem: ImageHistoryItemClient | null;
  imageLoading: boolean;
  imageError: string;
  imagePrompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onSelectItem: (item: ImageHistoryItemClient | null) => void;
  refAttachments: PendingAttachment[];
  onAddRefFiles: (files: File[]) => void;
  onRemoveRefAttachment: (idx: number) => void;
  imageFileInputRef: React.RefObject<HTMLInputElement | null>;
  aspectRatio: string;
  onAspectRatioChange: (ar: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  previewImage: string | null;
  onPreviewChange: (src: string | null) => void;
  confirmDeleteId: string | null;
  onConfirmDeleteChange: (id: string | null) => void;
}
```

**Проверка после Этапа 5:** `npm run build`. Image mode полностью декомпозирован. `page.tsx` теперь должен быть **≤150 строк** — orchestrator с Suspense, hook destructuring, handler wiring, JSX (Sidebar + AppHeader + ChatView / ImageView), route sync effects.

---

### Этап 6: Header + Sidebar decomposition

#### 6.1 Создать `components/app-header.tsx` (~60 строк)

Вынести хедер из page.tsx (L1080–1102):
- Hamburger menu button (mobile only — md:hidden)
- Provider color dot + model name + loading status
- Spacer div for mobile (w-9 md:hidden)

```typescript
interface AppHeaderProps {
  mode: Mode;
  selectedModel: ModelOption;
  selectedImageModel: ModelOption;
  isLoading: boolean;
  status: ChatStatus;
  onToggleSidebar: () => void;
}
```

#### 6.2 Извлечь `components/sidebar/model-dropdown.tsx` (~120 строк)

Перенести `ModelAccordionDropdown` из `sidebar.tsx` (L69–211) в отдельный файл. Экспорт: `export function ModelDropdown(...)`.

Содержит: accordion с группировкой по provider, expandable sections, click-outside handler.

#### 6.3 Извлечь `components/sidebar/chat-item.tsx` (~120 строк)

Перенести `ChatItem` из `sidebar.tsx` (L215–370).

Содержит: inline editing, context menu (rename/delete) с `MoreHorizontal`, click-outside handler, `ConfirmModal`.

#### 6.4 Создать `components/sidebar/chat-list.tsx` (~60 строк)

Вынести секцию со списком чатов из Sidebar:
- Кнопка «Новый чат»
- `displayedChats.map(ChatItem)`
- «Все чаты» toggle (показывается при `chats.length > 8`)

```typescript
interface ChatListProps {
  chats: ChatListItem[];
  activeChatId: string | null;
  showAllChats: boolean;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onToggleAllChats: () => void;
}
```

#### 6.5 Создать `components/sidebar/image-history-list.tsx` (~80 строк)

Вынести секцию с историей генераций из Sidebar:
- Кнопка «Новая генерация»
- History header
- List items с thumbnails
- Delete button на каждом item
- `ConfirmModal` для подтверждения удаления

```typescript
interface ImageHistoryListProps {
  imageHistory: ImageHistoryItemClient[];
  activeImageId: string | null;
  onSelectImageItem: (item: ImageHistoryItemClient) => void;
  onDeleteImageHistory: (id: string) => void;
  onNewImageGeneration: () => void;
  onClose: () => void;
}
```

#### 6.6 Создать `components/sidebar/sidebar-footer.tsx` (~30 строк)

Кнопки «Админ-панель» (router.push("/admin")) и «Выйти» (POST /api/auth/logout).

#### 6.7 Рефакторинг `components/sidebar/sidebar.tsx` (~120 строк)

Orchestrator: logo, mode tabs, model selector (делегация в `ModelDropdown`), content area (делегация в `ChatList` / `ImageHistoryList`), footer (делегация в `SidebarFooter`).

**`SidebarProps` остаются такими же** для backward compatibility, но внутри — делегация sub-компонентам.

Экспорт: `export function Sidebar(...)` (named export). Обновить импорт в `page.tsx`:
```diff
- import Sidebar from "@/components/sidebar";
+ import { Sidebar } from "@/components/sidebar/sidebar";
```

**Проверка после Этапа 6:** `npm run build`.

---

### Этап 7: Chat Message decomposition

#### 7.1 Извлечь `components/chat-message/code-block.tsx` (~50 строк)

Перенести `CodeBlock` из `chat-message.tsx` (L50–104).

Содержит: SyntaxHighlighter + copy button. Экспорт: `export function CodeBlock(...)`.

#### 7.2 Извлечь `components/chat-message/markdown-content.tsx` (~80 строк)

Перенести `MarkdownContent` из `chat-message.tsx` (L108–190).

Содержит: ReactMarkdown с кастомными renderers (code → CodeBlock, table, a, blockquote). Импортирует `CodeBlock` из `./code-block`.

#### 7.3 Извлечь `components/chat-message/attachment-preview.tsx` (~55 строк)

Перенести `AttachmentPreview` из `chat-message.tsx` (L194–241).

Содержит: image thumbnails (кликабельные) + file download links + inline `ImagePreviewModal`.

#### 7.4 Создать `components/chat-message/message-actions.tsx` (~65 строк)

Вынести action bars из ChatMessage — два блока (assistant: L367–416 и user: L418–449). Объединить в один компонент:

```typescript
interface MessageActionsProps {
  role: "user" | "assistant";
  content: string;
  messageId: string;
  onDelete?: (messageId: string) => void;
}
```

Содержит: copy button (только для assistant), delete button + inline confirm, state: `copied`, `confirmDelete`.

#### 7.5 Рефакторинг `components/chat-message/chat-message.tsx` (~120 строк)

Основной компонент, собирающий sub-компоненты: avatar, AttachmentPreview, reasoning block, error block, message bubble (MarkdownContent), MessageActions.

Реэкспорт для backward compatibility:
```typescript
export { type MessageData } from "@/lib/types";
```

Экспорт: `export const ChatMessage = memo(function ChatMessage(...) { ... })`. Обновить импорт в `page.tsx`:
```diff
- import ChatMessage from "@/components/chat-message";
- import type { MessageData } from "@/components/chat-message";
+ import { ChatMessage } from "@/components/chat-message/chat-message";
+ import type { MessageData } from "@/lib/types";
```

**Проверка после Этапа 7:** `npm run build`.

---

### Этап 8: Mobile Viewport Fix + CSS

**Цель:** исправить проблему с хедером/футером, уходящими за экран на мобильных устройствах.

#### 8.1 Обновить `app/globals.css`

Добавить в начало файла (после импортов Tailwind и KaTeX):

```css
/* Fix mobile viewport — use dynamic viewport height */
html, body {
  height: 100dvh;
  overflow: hidden;
}

/* Safe area for devices with notch / home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
```

#### 8.2 Обновить корневой контейнер

В финальном `page.tsx` (после рефакторинга) заменить `h-screen` на `h-dvh`:

```diff
- <div className="flex h-screen bg-slate-900 text-white" ref={chatContainerRef}>
+ <div className="flex h-dvh bg-slate-900 text-white">
```

> `dvh` (dynamic viewport height) корректно учитывает появление/скрытие адресной строки на iOS Safari и Chrome Android. Tailwind CSS v4 поддерживает `h-dvh` нативно.

#### 8.3 Добавить viewport meta-тег

В `app/layout.tsx` экспортировать `viewport` отдельно от `metadata` (требование Next.js 14+):

```typescript
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};
```

> В Next.js 14+ viewport настройки экспортируются отдельно через `export const viewport: Viewport`.
> `interactive-widget: resizes-visual` предотвращает сдвиг layout при появлении виртуальной клавиатуры.
> `viewport-fit: cover` позволяет использовать `env(safe-area-inset-*)` для устройств с notch/home indicator.

#### 8.4 Добавить safe-area padding

Добавить класс `safe-area-bottom` к контейнерам input-area в:
- `app/(chat)/_components/chat-input.tsx` — оборачивающий div
- `app/(image)/_components/image-input.tsx` — оборачивающий div

**Проверка после Этапа 8:** `npm run build`. Проверить на мобильном устройстве / DevTools responsive mode.

---

### Вне текущего скоупа (backlog)

| Файл | Строк | Проблема | Приоритет |
|---|---|---|---|
| `app/admin/page.tsx` | 278 | Превышает 200-строчный лимит (×1.4). Содержит user CRUD + inline формы. | Низкий — можно декомпозировать отдельно |
| `lib/local-llm-stream.ts` | 452 | Серверная утилита, формально не компонент/хук, лимит не применяется. Содержит класс `ThinkTagDetector` (~80 строк), который можно вынести. | Низкий |

Эти файлы **не блокируют** основной рефакторинг и могут быть декомпозированы независимо после завершения 8 этапов.

---

## ⚠️ Важные правила при выполнении

1. **Порядок:** выполнять этапы строго последовательно (1 → 8). Каждый следующий этап зависит от предыдущего.
2. **`npm run build` после каждого этапа.** Если сломалось — исправить до перехода к следующему.
3. **Именованные экспорты:** все компоненты используют `export function` или `export const` (named exports). `export default` только для `page.tsx`.
4. **Не менять внешний API:** props компонентов верхнего уровня (`Sidebar`, `ChatMessage`) должны оставаться совместимыми до этапов 6–7 (где они декомпозируются). Рефакторинг — внутренний.
5. **Import paths:** использовать `@/` алиасы: `@/hooks/...`, `@/lib/...`, `@/components/...`.
6. **Типы:** shared типы в `lib/types.ts`, локальные (props интерфейсы) — в файле компонента.
7. **Backward compatibility файлов:** старые файлы в `data/uploads/{uuid}.ext` (без userId в пути) должны оставаться доступными для чтения. Новые файлы сохраняются в `data/uploads/{userId}/{uuid}.ext`.
8. **Русский язык в UI**, английский в коде и комментариях.
9. **Максимум 200 строк на компонент, 150 строк на хук** — жёсткий лимит.
10. **После рефакторинга `page.tsx`:** должен остаться **≤150 строк** orchestrator (Suspense wrapper, hook destructuring, handler wiring, JSX с Sidebar + AppHeader + ChatView/ImageView + route sync effects).
11. **`"use client"` директива:** ставить в файлах, которые используют React hooks или browser APIs. Все файлы в `hooks/`, компоненты с useState/useEffect, и page.tsx. Чистые presentational компоненты получают `"use client"` контекст от parent.
12. **Не создавать summary/changelog файлы.** Все изменения отслеживаются через git.

---

## 📊 Ожидаемый результат

| Метрика | До | После |
|---|---|---|
| Макс. файл (компонент) | 1792 строк (page.tsx) | ≤200 строк |
| Макс. хук | ~440 строк (inline usePersistentChat) | ≤150 строк |
| Кол-во файлов (TS/TSX) | 29 | ~55 |
| File security | ❌ Плоская директория | ✅ Per-user isolation |
| Mobile viewport | ❌ `h-screen` | ✅ `h-dvh` + safe-area |
| Типы | 🟡 Дублируются в 3+ файлах | ✅ Централизованы в `lib/types.ts` |
| Константы | 🟡 Inline в page.tsx | ✅ В `lib/constants/` |
| Компонентов в файле | До 5 (chat-message.tsx) | Строго 1 |
| `resolveFileUrl` | 🟡 Дублируется в 2 route.ts | ✅ Единый `lib/file-storage.ts` |
| `MIME_TYPES` | 🟡 Дублируется в 3 файлах | ✅ Единый экспорт из `lib/file-storage.ts` |
