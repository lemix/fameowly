import fs from "fs";
import path from "path";
import { DATA_DIR } from "./paths";
import {
  AVAILABLE_MODELS,
  IMAGE_MODELS,
  type ModelOption,
  type ModelsConfig,
} from "./models";

const MODELS_JSON_PATH = path.join(DATA_DIR, "models.json");

/**
 * Apply defaults to a raw model entry from JSON config.
 * - `isLocal` defaults to `true` when provider is "local", `false` otherwise
 * - `supportsReasoning` / `supportsTemperature` default to `false`
 * - legacy `pricePer1MTokens` becomes both input and output price
 */
function normalizeModel(raw: ModelOption): ModelOption {
  const legacyPrice = raw.pricePer1MTokens;
  return {
    ...raw,
    isLocal: raw.isLocal ?? (raw.provider === "local"),
    supportsReasoning: raw.supportsReasoning ?? false,
    supportsTemperature: raw.supportsTemperature ?? false,
    inputPricePer1M: raw.inputPricePer1M ?? legacyPrice,
    outputPricePer1M: raw.outputPricePer1M ?? legacyPrice,
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

/** Strip internal cost fields — only admins may see them */
export function stripPricingForNonAdmin(
  config: ModelsConfig,
  isAdmin: boolean,
): ModelsConfig {
  if (isAdmin) return config;
  const strip = (m: ModelOption): ModelOption => {
    const clone: ModelOption = { ...m };
    delete clone.inputPricePer1M;
    delete clone.outputPricePer1M;
    delete clone.pricePerImage;
    delete clone.pricePer1MTokens;
    delete clone.markup;
    return clone;
  };
  return {
    chatModels: config.chatModels.map(strip),
    imageModels: config.imageModels.map(strip),
  };
}
