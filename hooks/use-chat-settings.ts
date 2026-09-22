"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatSettings } from "@/lib/types";

const STORAGE_KEY = "chat-settings";
const DEFAULT_SETTINGS: ChatSettings = {
  temperature: 0.6,
  reasoningEnabled: true,
  webSearchEnabled: true,
};

/** Read all per-chat settings from localStorage */
function readAllSettings(): Record<string, Partial<ChatSettings>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Write all per-chat settings to localStorage */
function writeAllSettings(all: Record<string, Partial<ChatSettings>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent — localStorage might be full */ }
}

/** Fill in defaults for settings saved before a field existed */
function withDefaults(saved: Partial<ChatSettings>): ChatSettings {
  return {
    temperature: saved.temperature ?? DEFAULT_SETTINGS.temperature,
    reasoningEnabled: saved.reasoningEnabled ?? DEFAULT_SETTINGS.reasoningEnabled,
    webSearchEnabled: saved.webSearchEnabled ?? DEFAULT_SETTINGS.webSearchEnabled,
  };
}

/**
 * Manages per-chat generation settings (temperature, reasoning, web search).
 * Settings are persisted in localStorage keyed by chatId.
 *
 * Key behavior:
 * - When activeChatId is null (new chat): show defaults, don't persist
 * - When activeChatId changes to non-null with saved settings: restore them
 * - When activeChatId changes to non-null WITHOUT saved settings (first message
 *   just created the chat): keep current values and persist them (BUG-03 fix)
 */
export function useChatSettings(activeChatId: string | null) {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);

  // Ref tracks the latest values so the useEffect can read them
  // without being in the dependency array (avoids infinite loops)
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load / persist settings when chat changes
  useEffect(() => {
    if (!activeChatId) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    const all = readAllSettings();
    const saved = all[activeChatId];
    if (saved) {
      setSettings(withDefaults(saved));
    } else {
      // New chat (no saved settings) — keep current values and persist them.
      // This prevents the reset-to-defaults bug when the first message creates the chat.
      all[activeChatId] = settingsRef.current;
      writeAllSettings(all);
    }
  }, [activeChatId]);

  const update = useCallback((patch: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (activeChatId) {
        const all = readAllSettings();
        all[activeChatId] = next;
        writeAllSettings(all);
      }
      return next;
    });
  }, [activeChatId]);

  const setTemperature = useCallback(
    (value: number) => update({ temperature: value }), [update]);
  const setReasoningEnabled = useCallback(
    (value: boolean) => update({ reasoningEnabled: value }), [update]);
  const setWebSearchEnabled = useCallback(
    (value: boolean) => update({ webSearchEnabled: value }), [update]);

  const resetToDefaults = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return {
    temperature: settings.temperature,
    setTemperature,
    reasoningEnabled: settings.reasoningEnabled,
    setReasoningEnabled,
    webSearchEnabled: settings.webSearchEnabled,
    setWebSearchEnabled,
    resetToDefaults,
  };
}
