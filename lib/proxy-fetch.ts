/**
 * SOCKS5-aware fetch wrapper.
 *
 * When environment contains a SOCKS proxy URL (checked in order:
 * SOCKS_PROXY → ALL_PROXY → HTTPS_PROXY → HTTP_PROXY), all outgoing
 * HTTP/HTTPS requests made via `proxyFetch` are tunnelled through it.
 *
 * If no SOCKS proxy is configured the global `fetch` is used as-is.
 */

import { Agent, fetch as undiciFetch } from "undici";
import { SocksClient } from "socks";
import * as tls from "node:tls";

// ---------------------------------------------------------------------------
// Resolve proxy URL from environment
// ---------------------------------------------------------------------------

function getSocksProxyUrl(): string | undefined {
  const candidates = [
    process.env.SOCKS_PROXY,
    process.env.ALL_PROXY,
    process.env.HTTPS_PROXY,
    process.env.HTTP_PROXY,
  ];
  for (const url of candidates) {
    if (url && /^socks[45h]?:\/\//i.test(url)) {
      return url;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Lazy-initialised undici dispatcher that tunnels via SOCKS5
// ---------------------------------------------------------------------------

let _dispatcher: Agent | undefined;

function getDispatcher(): Agent | undefined {
  if (_dispatcher) return _dispatcher;

  const proxyUrl = getSocksProxyUrl();
  if (!proxyUrl) return undefined;

  const proxy = new URL(proxyUrl);
  const proxyHost = proxy.hostname;
  const proxyPort = Number(proxy.port);
  const proxyUserId = proxy.username || undefined;
  const proxyPassword = proxy.password || undefined;

  console.log(
    `[proxy-fetch] SOCKS5 proxy configured: ${proxyHost}:${proxyPort}`,
  );

  _dispatcher = new Agent({
    connect(
      opts: {
        hostname: string;
        host: string;
        port: string;
        protocol: string;
        servername?: string;
      },
      cb: (err: Error | null, socket: unknown) => void,
    ) {
      const destHost = opts.hostname || opts.host;
      const destPort = Number(opts.port);

      SocksClient.createConnection({
        proxy: {
          host: proxyHost,
          port: proxyPort,
          type: 5,
          ...(proxyUserId ? { userId: proxyUserId } : {}),
          ...(proxyPassword ? { password: proxyPassword } : {}),
        },
        command: "connect",
        destination: { host: destHost, port: destPort },
      })
        .then(({ socket }) => {
          if (opts.protocol === "https:") {
            const tlsSocket = tls.connect({
              socket,
              servername: opts.servername || destHost,
            });
            tlsSocket.once("secureConnect", () => cb(null, tlsSocket));
            tlsSocket.once("error", (err) => cb(err, null));
          } else {
            cb(null, socket);
          }
        })
        .catch((err) => cb(err, null));
    },
  } as ConstructorParameters<typeof Agent>[0]);

  return _dispatcher;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Drop-in replacement for `fetch()` that routes traffic through the
 * configured SOCKS5 proxy.  Signature matches `typeof globalThis.fetch`
 * so it can be passed directly to AI SDK provider constructors.
 */
export function proxyFetch(
  input: string | URL | globalThis.Request,
  init?: globalThis.RequestInit,
): Promise<globalThis.Response> {
  const dispatcher = getDispatcher();

  if (!dispatcher) {
    // No proxy configured – use the built-in fetch directly
    return globalThis.fetch(input, init);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return undiciFetch(input as any, {
    ...(init as any),
    dispatcher,
  }) as unknown as Promise<globalThis.Response>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
