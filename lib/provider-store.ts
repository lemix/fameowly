/**
 * Provider store — CRUD for virtual providers (data/providers.json)
 * and in-memory rotation state with periodic flush to disk.
 *
 * This is core infrastructure (data access), not a plugin feature.
 * The admin UI for managing providers lives in the plugins directory.
 */

import fs from "fs";
import path from "path";
import { DATA_DIR } from "./paths";
import type { VirtualProvider, RotationState } from "./types";

// ─── File paths ──────────────────────────────────────────────────────

const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const ROTATION_FILE = path.join(DATA_DIR, "rotation-state.json");

// ─── Ensure data dir ─────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o755 });
  }
}

// ─── Providers CRUD ──────────────────────────────────────────────────

export function getProviders(): VirtualProvider[] {
  try {
    if (fs.existsSync(PROVIDERS_FILE)) {
      return JSON.parse(fs.readFileSync(PROVIDERS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read providers.json:", err);
  }
  return [];
}

export function saveProviders(providers: VirtualProvider[]): void {
  ensureDataDir();
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
}

export function getProviderById(id: string): VirtualProvider | undefined {
  return getProviders().find((p) => p.id === id);
}

export function upsertProvider(provider: VirtualProvider): void {
  const providers = getProviders();
  const idx = providers.findIndex((p) => p.id === provider.id);
  if (idx >= 0) {
    providers[idx] = provider;
  } else {
    providers.push(provider);
  }
  saveProviders(providers);
  _providersCache = null;
}

export function deleteProvider(id: string): boolean {
  const providers = getProviders();
  const filtered = providers.filter((p) => p.id !== id);
  if (filtered.length === providers.length) return false;
  saveProviders(filtered);
  _providersCache = null;
  return true;
}

// ─── In-memory cache for providers ───────────────────────────────────

let _providersCache: VirtualProvider[] | null = null;
let _providersCacheMtime = 0;

export function getCachedProviders(): VirtualProvider[] {
  try {
    if (fs.existsSync(PROVIDERS_FILE)) {
      const stat = fs.statSync(PROVIDERS_FILE);
      const mtime = stat.mtimeMs;
      if (_providersCache && mtime === _providersCacheMtime) {
        return _providersCache;
      }
      _providersCache = JSON.parse(fs.readFileSync(PROVIDERS_FILE, "utf-8"));
      _providersCacheMtime = mtime;
      return _providersCache!;
    }
  } catch {
    // fall through
  }
  return [];
}

// ─── Rotation state (in-memory + periodic flush) ─────────────────────

let _rotationState: RotationState = { counters: {}, currentIndex: {} };
let _rotationDirty = false;
let _flushTimer: ReturnType<typeof setInterval> | null = null;

function loadRotationState(): void {
  try {
    if (fs.existsSync(ROTATION_FILE)) {
      _rotationState = JSON.parse(fs.readFileSync(ROTATION_FILE, "utf-8"));
    }
  } catch {
    _rotationState = { counters: {}, currentIndex: {} };
  }
}

function flushRotationState(): void {
  if (!_rotationDirty) return;
  try {
    ensureDataDir();
    fs.writeFileSync(ROTATION_FILE, JSON.stringify(_rotationState, null, 2));
    _rotationDirty = false;
  } catch (err) {
    console.error("Failed to flush rotation state:", err);
  }
}

function ensureFlushTimer(): void {
  if (_flushTimer) return;
  _flushTimer = setInterval(flushRotationState, 30_000);
  if (_flushTimer.unref) _flushTimer.unref();
}

loadRotationState();
ensureFlushTimer();

/**
 * Get the next key for a virtual provider + role, applying rotation.
 */
export function getRotatedKey(
  virtualProviderId: string,
  role: string,
  keys: string[],
  rotationThreshold: number,
): string {
  if (keys.length === 0) {
    throw new Error(`No keys configured for provider ${virtualProviderId}, role ${role}`);
  }
  if (keys.length === 1 || rotationThreshold <= 0) {
    return keys[0];
  }

  const stateKey = `${virtualProviderId}:${role}`;
  const currentIdx = _rotationState.currentIndex[stateKey] ?? 0;
  const counterKey = `${stateKey}:${currentIdx}`;
  const count = (_rotationState.counters[counterKey] ?? 0) + 1;

  if (count >= rotationThreshold) {
    const nextIdx = (currentIdx + 1) % keys.length;
    _rotationState.currentIndex[stateKey] = nextIdx;
    _rotationState.counters[counterKey] = 0;
    _rotationState.counters[`${stateKey}:${nextIdx}`] = 0;
    _rotationDirty = true;
    return keys[nextIdx];
  }

  _rotationState.counters[counterKey] = count;
  _rotationDirty = true;
  return keys[currentIdx];
}
