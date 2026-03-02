import fs from "fs";
import path from "path";
import {
  AVAILABLE_MODELS,
  IMAGE_MODELS,
  type ModelsConfig,
} from "./models";

const MODELS_JSON_PATH = path.join(process.cwd(), "data", "models.json");

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
          parsed.chatModels?.length > 0
            ? parsed.chatModels
            : AVAILABLE_MODELS,
        imageModels:
          parsed.imageModels?.length > 0
            ? parsed.imageModels
            : IMAGE_MODELS,
      };
    }
  } catch (err) {
    console.error("Failed to read models.json, using defaults:", err);
  }
  return {
    chatModels: AVAILABLE_MODELS,
    imageModels: IMAGE_MODELS,
  };
}
