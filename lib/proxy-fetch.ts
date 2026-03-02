/**
 * proxyFetch — drop-in замена globalThis.fetch с поддержкой SOCKS5-прокси.
 *
 * Читает прокси из (в порядке приоритета):
 *   SOCKS_PROXY, ALL_PROXY, HTTPS_PROXY, HTTP_PROXY
 *
 * Если переменная не задана — использует стандартный fetch без изменений.
 */

import { SocksClient } from "socks";
import { Agent, fetch as undiciFetch } from "undici";
import type { Dispatcher } from "undici";
import * as tls from "tls";
import * as net from "net";

// ─── helpers ────────────────────────────────────────────────────────────────

function parseSocksProxy(raw: string): { host: string; port: number } | null {
  try {
    const normalised = /^socks/.test(raw) ? raw : `socks5://${raw}`;
    const url = new URL(normalised);
    if (!url.hostname) return null;
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 1080,
    };
  } catch {
    return null;
  }
}

function getSocksProxy(): { host: string; port: number } | null {
  const candidates = [
    process.env.SOCKS_PROXY,
    process.env.ALL_PROXY,
    process.env.HTTPS_PROXY,
    process.env.HTTP_PROXY,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    if (/^socks/.test(raw)) {
      const parsed = parseSocksProxy(raw);
      if (parsed) return parsed;
    }
  }
  return null;
}

// ─── undici dispatcher с SOCKS5 ─────────────────────────────────────────────

let _dispatcher: Dispatcher | null = null;

function getDispatcher(): Dispatcher {
  if (_dispatcher) return _dispatcher;

  const proxy = getSocksProxy();

  if (!proxy) {
    _dispatcher = new Agent();
    return _dispatcher;
  }

  console.log(`[proxy-fetch] Using SOCKS5 proxy: ${proxy.host}:${proxy.port}`);

  _dispatcher = new Agent({
    connect(options, callback) {
      // undici передаёт опции как Record — безопасно читаем через unknown
      const opts = options as Record<string, unknown>;

      const targetHost = (opts.hostname as string | undefined) ?? "";

      // Определяем является ли соединение HTTPS
      const protocol = opts.protocol as string | undefined;
      const servername = opts.servername as string | undefined;
      const isHttps = protocol === "https:" || servername != null;

      // Определяем порт — если undici не передал или передал 0, берём дефолт
      const rawPort = opts.port;
      let targetPort: number;
      if (typeof rawPort === "number" && rawPort > 0) {
        targetPort = rawPort;
      } else if (typeof rawPort === "string" && parseInt(rawPort, 10) > 0) {
        targetPort = parseInt(rawPort, 10);
      } else {
        targetPort = isHttps ? 443 : 80;
      }

      console.log(
        `[proxy-fetch] CONNECT ${targetHost}:${targetPort} via SOCKS5 ${proxy.host}:${proxy.port}`
      );

      SocksClient.createConnection(
        {
          proxy: { host: proxy.host, port: proxy.port, type: 5 },
          command: "connect",
          destination: { host: targetHost, port: targetPort },
        },
        (err, info) => {
          if (err || !info) {
            callback(err ?? new Error("SOCKS5: no connection info"), null);
            return;
          }

          const rawSocket: net.Socket = info.socket;

          if (isHttps) {
            const tlsSocket = tls.connect({
              socket: rawSocket,
              servername: servername ?? targetHost,
              rejectUnauthorized: opts.rejectUnauthorized !== false,
            });

            tlsSocket.once("secureConnect", () => {
              // undici ожидает net.Socket-совместимый объект
              callback(null, tlsSocket as unknown as net.Socket);
            });

            tlsSocket.once("error", (tlsErr) => {
              callback(tlsErr, null);
            });
          } else {
            callback(null, rawSocket);
          }
        }
      );
    },
  });

  return _dispatcher;
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Drop-in замена fetch, которая направляет запросы через SOCKS5-прокси,
 * если задана переменная окружения SOCKS_PROXY / ALL_PROXY / HTTPS_PROXY / HTTP_PROXY.
 */
export function proxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const dispatcher = getDispatcher();

  return undiciFetch(input as Parameters<typeof undiciFetch>[0], {
    ...(init as Parameters<typeof undiciFetch>[1]),
    dispatcher,
  }) as unknown as Promise<Response>;
}
