"use client";

import { useState, useCallback, useEffect } from "react";
import type { ChatSettings } from "@/lib/types";

const STORAGE_KEY = "chat-settings";
const DEFAULT_SETTINGS: ChatSettings = { temperature: 0.6, reasoningEnabled: true };

/** Read all per-chat settings from localStorage */
function readAllSettings(): Record<string, ChatSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Write all per-chat settings to localStorage */
function writeAllSettings(all: Record<string, ChatSettings>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent — localStorage might be full */ }
}

/**
 * Manages per-chat generation settings (temperature, reasoning).
 * Settings are persisted in localStorage keyed by chatId.
 * Returns current values + setters that auto-persist.
 */
export function useChatSettings(activeChatId: string | null) {
  const [temperature, setTemperatureState] = useState(DEFAULT_SETTINGS.temperature);
  const [reasoningEnabled, setReasoningEnabledState] = useState(DEFAULT_SETTINGS.reasoningEnabled);

  // Load settings when chat changes
  useEffect(() => {
    if (!activeChatId) {
      setTemperatureState(DEFAULT_SETTINGS.temperature);
      setReasoningEnabledState(DEFAULT_SETTINGS.reasoningEnabled);
      return;
    }
    const all = readAllSettings();
    const saved = all[activeChatId];
    if (saved) {
      setTemperatureState(saved.temperature ?? DEFAULT_SETTINGS.temperature);
      setReasoningEnabledState(saved.reasoningEnabled ?? DEFAULT_SETTINGS.reasoningEnabled);
    } else {
      setTemperatureState(DEFAULT_SETTINGS.temperature);
      setReasoningEnabledState(DEFAULT_SETTINGS.reasoningEnabled);
    }
  }, [activeChatId]);

  /** Persist current settings for the active chat */
  const persist = useCallback((temp: number, reasoning: boolean) => {
    if (!activeChatId) return;
    const all = readAllSettings();
    all[activeChatId] = { temperature: temp, reasoningEnabled: reasoning };
    writeAllSettings(all);
  }, [activeChatId]);

  const setTemperature = useCallback((value: number) => {
    setTemperatureState(value);
    setReasoningEnabledState((prev) => {
      persist(value, prev);
      return prev;
    });
  }, [persist]);

  const setReasoningEnabled = useCallback((value: boolean) => {
    setReasoningEnabledState(value);
    setTemperatureState((prev) => {
      persist(prev, value);
      return prev;
    });
  }, [persist]);

  const resetToDefaults = useCallback(() => {
    setTemperatureState(DEFAULT_SETTINGS.temperature);
    setReasoningEnabledState(DEFAULT_SETTINGS.reasoningEnabled);
  }, []);

  return {
    temperature,
    setTemperature,
    reasoningEnabled,
    setReasoningEnabled,
    resetToDefaults,
  };
}
