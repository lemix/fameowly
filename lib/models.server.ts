import fs from "fs";
import path from "path";
import {
  AVAILABLE_MODELS,
  IMAGE_MODELS,
  type ModelOption,
  type ModelsConfig,
} from "./models";

const MODELS_JSON_PATH = path.join(process.cwd(), "data", "models.json");

/**
 * Apply defaults to a raw model entry from JSON config.
 * - `isLocal` defaults to `true` when provider is "local", `false` otherwise
 * - `supportsReasoning` / `supportsTemperature` default to `false`
 * - `clientPrice` stays as-is (undefined = not available to client-role users)
 */
function normalizeModel(raw: ModelOption): ModelOption {
  return {
    ...raw,
    isLocal: raw.isLocal ?? (raw.provider === "local"),
    supportsReasoning: raw.supportsReasoning ?? false,
    supportsTemperature: raw.supportsTemperature ?? false,
  };
}

/**
 * Read models config from data/models.json (server-side only).
 * Falls back to built-in defaults if the file doesn't exist or is invalid.
 */
export function readModelsConfig(): ModelsConfig {
  try {
    if (fs.existsSync(MODELS_JSON_PATH)) {
      const raw = fs.readFileSync(MODELS_JSON_PATH, "utf-8");
      const parsed = JSON.parse(raw) as ModelsConfig;
      return {
        chatModels:
          (parsed.chatModels?.length > 0
            ? parsed.chatModels
            : AVAILABLE_MODELS
          ).map(normalizeModel),
        imageModels:
          (parsed.imageModels?.length > 0
            ? parsed.imageModels
            : IMAGE_MODELS
          ).map(normalizeModel),
      };
    }
  } catch (err) {
    console.error("Failed to read models.json, using defaults:", err);
  }
  return {
    chatModels: AVAILABLE_MODELS.map(normalizeModel),
    imageModels: IMAGE_MODELS.map(normalizeModel),
  };
}

/**
 * Write models config to data/models.json (server-side only).
 */
export function saveModelsConfig(config: ModelsConfig): void {
  const dir = path.dirname(MODELS_JSON_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
  fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(config, null, 2));
}

/**
 * Filter models based on user role.
 * Client-role users only see models that have `clientPrice` defined.
 */
export function filterModelsForRole(
  config: ModelsConfig,
  role: string | null,
): ModelsConfig {
  if (role !== "client") return config;
  return {
    chatModels: config.chatModels.filter((m) => m.clientPrice != null),
    imageModels: config.imageModels.filter((m) => m.clientPrice != null),
  };
}
