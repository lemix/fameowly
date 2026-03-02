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
import type buildConnector from "undici/types/connector";
import * as tls from "node:tls";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Parse a socks5:// URL into host + port. */
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
    if (raw && /^socks/.test(raw)) {
      const parsed = parseSocksProxy(raw);
      if (parsed) return parsed;
    }
  }
  return null;
}

// ─── undici dispatcher с SOCKS5 ─────────────────────────────────────────────

let _dispatcher: Agent | undefined;

function getDispatcher(): Agent | undefined {
  if (_dispatcher) return _dispatcher;

  const proxy = getSocksProxy();
  if (!proxy) return undefined;

  console.log(`[proxy-fetch] Using SOCKS5 proxy: ${proxy.host}:${proxy.port}`);

  // undici Agent принимает connect: buildConnector.connector
  // Сигнатура: (options: buildConnector.Options, callback: buildConnector.Callback) => void
  //
  // buildConnector.Options = {
  //   hostname: string       — целевой хост
  //   host?: string          — хост с портом ("example.com:8443")
  //   protocol: string       — "https:" | "http:"
  //   port: string           — порт как строка; "" если не задан явно в URL
  //   servername?: string    — для TLS SNI (runtime: null если не задан)
  //   localAddress?: string | null
  // }
  //
  // buildConnector.Callback = [null, Socket | TLSSocket] | [Error, null]

  const connect: buildConnector.connector = (
    options: buildConnector.Options,
    callback: buildConnector.Callback,
  ) => {
    const targetHost = options.hostname;
    const isHttps = options.protocol === "https:";

    // options.port — всегда строка; "" для дефолтных портов (443/80)
    const parsed = parseInt(options.port, 10);
    const targetPort = parsed > 0 ? parsed : isHttps ? 443 : 80;

    console.log(
      `[proxy-fetch] CONNECT ${targetHost}:${targetPort} via SOCKS5 ${proxy.host}:${proxy.port}`,
    );

    SocksClient.createConnection({
      proxy: { host: proxy.host, port: proxy.port, type: 5 },
      command: "connect",
      destination: { host: targetHost, port: targetPort },
    })
      .then((info) => {
        if (!isHttps) {
          callback(null, info.socket);
          return;
        }

        // Оборачиваем raw TCP-сокет в TLS для HTTPS
        const tlsSocket = tls.connect({
          socket: info.socket,
          servername: options.servername ?? targetHost,
        });

        tlsSocket.once("secureConnect", () => {
          callback(null, tlsSocket);
        });

        tlsSocket.once("error", (err) => {
          callback(err, null);
        });
      })
      .catch((err) => {
        callback(err, null);
      });
  };

  _dispatcher = new Agent({ connect });
  return _dispatcher;
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Drop-in замена fetch, которая направляет запросы через SOCKS5-прокси,
 * если задана переменная окружения SOCKS_PROXY / ALL_PROXY / HTTPS_PROXY / HTTP_PROXY.
 */
export function proxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const dispatcher = getDispatcher();

  if (!dispatcher) {
    return globalThis.fetch(input, init);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return undiciFetch(input as any, {
    ...(init as any),
    dispatcher,
  }) as unknown as Promise<Response>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
