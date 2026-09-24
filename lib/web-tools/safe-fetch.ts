/**
 * SSRF-hardened fetch for untrusted URLs.
 *
 * Every hop is validated separately and the socket is pinned to an address that
 * was checked *after* resolution, so a name cannot resolve to a public IP during
 * the check and to a LAN address at connect time (DNS rebinding).
 *
 * Deliberately not `proxyFetch`: that one falls back to plain fetch when no proxy
 * is configured, which would give untrusted URLs unrestricted access to the LAN.
 */

import net from "node:net";
import tls from "node:tls";
import { Agent, request } from "undici";
import type buildConnector from "undici/types/connector";
import { resolvePublicIps } from "./ip-guard";

const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const ALLOWED_TYPES = ["text/html", "text/plain", "application/xhtml+xml"];
const USER_AGENT = "Mozilla/5.0 (compatible; FamilyAIHub/1.0; +local)";

export interface SafeFetchResult {
  /** Final URL after redirects */
  url: string;
  contentType: string;
  body: string;
  truncated: boolean;
}

/** Route every connection to a pre-validated address, ignoring the system resolver. */
function pinnedAgent(ip: string): Agent {
  const connect: buildConnector.connector = (options, callback) => {
    const isTls = options.protocol === "https:";
    const port = parseInt(options.port, 10) || (isTls ? 443 : 80);
    const socket = net.connect({ host: ip, port });
    // A custom connector bypasses undici's `connectTimeout`; a DPI-throttled TLS
    // handshake would otherwise hang until the whole answer times out.
    socket.setTimeout(TIMEOUT_MS, () => socket.destroy(new Error("Таймаут соединения")));
    let settled = false;
    const connected = (s: net.Socket) => {
      if (settled) return;
      settled = true;
      socket.setTimeout(0);
      callback(null, s);
    };
    const failed = (err: Error) => {
      if (settled) return;
      settled = true;
      callback(err, null);
    };

    socket.once("error", failed);
    socket.once("connect", () => {
      if (!isTls) {
        connected(socket);
        return;
      }
      const secure = tls.connect({
        socket,
        servername: options.servername ?? options.hostname,
      });
      secure.once("secureConnect", () => connected(secure));
      secure.once("error", failed);
    });
  };

  return new Agent({ connect, connectTimeout: TIMEOUT_MS });
}

function assertFetchableUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Схема не поддерживается: ${url.protocol}`);
  }
}

/** Destroying an undici body without an error listener raises an unhandled 'error'. */
function discard(body: { on: (e: string, cb: () => void) => unknown; destroy: () => void }): void {
  body.on("error", () => { /* body intentionally dropped */ });
  body.destroy();
}

async function readCapped(
  body: AsyncIterable<Uint8Array>,
  signal: AbortSignal,
): Promise<{ text: string; truncated: boolean }> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;

  for await (const chunk of body) {
    if (signal.aborted) break;
    if (size + chunk.length > MAX_BYTES) {
      chunks.push(chunk.subarray(0, MAX_BYTES - size));
      truncated = true;
      break;
    }
    chunks.push(chunk);
    size += chunk.length;
  }

  return { text: Buffer.concat(chunks).toString("utf-8"), truncated };
}

/**
 * Fetch a public web page with SSRF protection and hard limits.
 * @throws when the URL, any redirect target, or the content type is not allowed.
 */
export async function safeFetch(
  rawUrl: string,
  options: { signal?: AbortSignal } = {},
): Promise<SafeFetchResult> {
  let current = new URL(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertFetchableUrl(current);
    const [ip] = await resolvePublicIps(current.hostname);

    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;

    const agent = pinnedAgent(ip);
    try {
      // undici does not follow redirects unless a redirect interceptor is added —
      // each hop is handled here so its target gets re-validated.
      const response = await request(current.toString(), {
        method: "GET",
        dispatcher: agent,
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
          "accept-language": "ru,en;q=0.8",
        },
      });

      const location = response.headers.location;
      if (response.statusCode >= 300 && response.statusCode < 400 && location) {
        discard(response.body);
        current = new URL(String(location), current);
        continue;
      }

      if (response.statusCode >= 400) {
        discard(response.body);
        throw new Error(`HTTP ${response.statusCode}`);
      }

      const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
      if (!ALLOWED_TYPES.some((type) => contentType.includes(type))) {
        discard(response.body);
        throw new Error(`Тип содержимого не поддерживается: ${contentType || "неизвестен"}`);
      }

      const { text, truncated } = await readCapped(response.body, signal);
      return { url: current.toString(), contentType, body: text, truncated };
    } finally {
      agent.close().catch(() => { /* already closed */ });
    }
  }

  throw new Error("Слишком много перенаправлений");
}
