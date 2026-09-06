// lib/types.ts — Shared client-side types

// Server types re-exported for convenience.
// IMPORTANT: use `export type` to ensure tree-shaking —
// these modules import `fs`/`path` which must NOT be bundled into client code.
export type { ModelOption, ModelsConfig, ModelTier } from "./models";
export type {
  ChatListItem,
  ChatAttachment,
  ChatSession,
  ChatMessageData,
} from "./chat-store";
export type { ImageHistoryItem } from "./image-store";

// Import for local use in type definitions
import type { ChatAttachment } from "./chat-store";
import type { UserRole } from "./auth";

export type { UserRole } from "./auth";

export type Mode = "chat" | "image";
export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/** Client-side user info (no password) */
export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
}

export interface PendingAttachment {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded?: ChatAttachment;
  error?: boolean;
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

// ─── Virtual Provider types ──────────────────────────────────────────

/** Base provider type (physical provider) */
export type BaseProvider = "google" | "google-vertex" | "openrouter" | "local";

/** Key group — a set of keys/endpoints assigned to a user role */
export interface KeyGroup {
  /** API keys (for google/openrouter) or base URLs (for local) */
  keys: string[];
  /** Switch to next key after this many requests (0 = no rotation) */
  rotationThreshold: number;
}

/** Virtual provider configuration */
export interface VirtualProvider {
  id: string;
  /** Display name, e.g. "Google Free", "Local Cluster 1" */
  name: string;
  /** Underlying physical provider */
  baseProvider: BaseProvider;
  /** Key groups keyed by user role; "default" is the fallback */
  groups: Record<string, KeyGroup>;
  /** Vertex AI only: GCP location (e.g. "global", "us-central1"). Overrides env. */
  vertexLocation?: string;
  /** Vertex AI only: GCP project ID. Overrides project_id from SA JSON / env. */
  vertexProject?: string;
}

/** Persisted rotation counters */
export interface RotationState {
  /** Key: "{virtualProviderId}:{role}:{keyIndex}" → request count */
  counters: Record<string, number>;
  /** Key: "{virtualProviderId}:{role}" → current key index */
  currentIndex: Record<string, number>;
}

/** Resolved credentials ready for use */
export interface ResolvedCredentials {
  baseProvider: BaseProvider;
  /** API key (google / openrouter) — empty for vertex/local */
  apiKey: string;
  /** Base URL — used by openrouter / local */
  baseURL?: string;
  /** Vertex AI: GCP project ID */
  project?: string;
  /** Vertex AI: GCP location, e.g. "us-central1" */
  location?: string;
  /** Vertex AI: Service Account JSON key (raw JSON string) */
  credentialsJson?: string;
}

/** Per-chat generation settings (persisted in localStorage) */
export interface ChatSettings {
  temperature: number;
  reasoningEnabled: boolean;
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

// ─── Plugin system types ─────────────────────────────────────────────

/** Token usage info reported to the UsageTracker after generation */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Admin tab descriptor provided by a plugin */
export interface PluginAdminTab {
  id: string;
  label: string;
  icon: string;
}

/** API route handler signature */
export type PluginRouteHandler = (
  req: import("next/server").NextRequest,
) => Promise<import("next/server").NextResponse> | import("next/server").NextResponse;

/** Plugin interface — every extension plugin implements this */
export interface Plugin {
  /** Unique plugin id, e.g. "providers", "billing" */
  id: string;
  /** Human-readable name */
  name: string;

  /** Register plugin services into the DI container */
  register?: (container: import("./container").ServiceRegistry) => void;

  /** Admin panel tabs this plugin provides */
  adminTabs?: PluginAdminTab[];

  /** Ids of UI slots this plugin fills; see lib/plugin-ui.tsx */
  uiSlots?: string[];

  /**
   * Additional API routes: key is sub-path (e.g. "providers"),
   * value is map of HTTP method to handler.
   */
  apiRoutes?: Record<
    string,
    Record<string, PluginRouteHandler>
  >;
}
