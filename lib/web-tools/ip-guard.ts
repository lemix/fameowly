/**
 * IP guard for server-side fetching of untrusted URLs.
 *
 * The hub runs inside a home LAN next to the LLM servers, so an SSRF here is a
 * direct path to them. Hostname strings are not enough: this module normalises
 * IP literals (decimal / octal / hex / IPv4-mapped IPv6) and matches real CIDRs.
 */

import { promises as dns } from "node:dns";
import net from "node:net";

/** CIDRs that must never be reachable from a fetched URL. */
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local + cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

const BLOCKED_V6: Array<[string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
];

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function v6ToBytes(ip: string): Uint8Array | null {
  const [head, tail] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined ? (tail ? tail.split(":") : []) : null;
  if (right === null && left.length !== 8) return null;

  const groups =
    right === null
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const n = parseInt(groups[i] || "0", 16);
    if (!Number.isInteger(n) || n < 0 || n > 0xffff) return null;
    bytes[i * 2] = n >> 8;
    bytes[i * 2 + 1] = n & 0xff;
  }
  return bytes;
}

function matchesV4(ip: string, [base, bits]: [string, number]): boolean {
  const a = v4ToInt(ip);
  const b = v4ToInt(base);
  if (a === null || b === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

function matchesV6(bytes: Uint8Array, [base, bits]: [string, number]): boolean {
  const b = v6ToBytes(base);
  if (!b) return false;
  for (let i = 0; i < bits; i++) {
    const byte = i >> 3;
    const bit = 7 - (i & 7);
    if (((bytes[byte] >> bit) & 1) !== ((b[byte] >> bit) & 1)) return false;
  }
  return true;
}

/**
 * Expand shorthand IP notations the URL parser accepts but humans rarely write:
 * `3232235777`, `0xC0A80101`, `0300.0250.0.1`, `[::ffff:192.168.0.1]`.
 * @returns a dotted-quad / plain IPv6 string, or null when the host is a real name.
 */
export function normalizeIpLiteral(host: string): string | null {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (net.isIPv6(h)) {
    // IPv4-mapped (::ffff:a.b.c.d) must be judged by its IPv4 half.
    const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? mapped[1] : h;
  }
  if (net.isIPv4(h)) return h;

  // Single integer or dotted parts in octal/hex — the classic SSRF bypass.
  const parts = h.split(".");
  if (parts.length > 4 || parts.some((p) => p === "")) return null;
  const nums: number[] = [];
  for (const part of parts) {
    const n = /^0x[0-9a-f]+$/.test(part)
      ? parseInt(part, 16)
      : /^0[0-7]+$/.test(part)
        ? parseInt(part, 8)
        : /^\d+$/.test(part)
          ? parseInt(part, 10)
          : NaN;
    if (!Number.isInteger(n) || n < 0) return null;
    nums.push(n);
  }
  // Last part absorbs the remaining bytes: 192.168.257 === 192.168.1.1
  const last = nums.pop()!;
  if (last >= 2 ** (8 * (4 - nums.length))) return null;
  const bytes = [...nums, ...Array(4 - nums.length).fill(0)];
  for (let i = 3; i >= nums.length; i--) {
    bytes[i] = (last >> (8 * (3 - i))) & 0xff;
  }
  return bytes.join(".");
}

/** True when the address belongs to a range the hub must never reach. */
export function isBlockedIp(ip: string): boolean {
  const normalized = normalizeIpLiteral(ip) ?? ip;
  if (net.isIPv4(normalized)) return BLOCKED_V4.some((cidr) => matchesV4(normalized, cidr));
  const bytes = v6ToBytes(normalized);
  if (!bytes) return true; // unparseable — refuse rather than guess
  return BLOCKED_V6.some((cidr) => matchesV6(bytes, cidr));
}

/** `dns.lookup` cannot be aborted and has no timeout of its own. */
const DNS_TIMEOUT_MS = 5000;

function lookupWithTimeout(hostname: string) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Таймаут DNS: ${hostname}`)), DNS_TIMEOUT_MS);
  });
  return Promise.race([dns.lookup(hostname, { all: true, verbatim: true }), timeout])
    .finally(() => clearTimeout(timer));
}

/**
 * Resolve a hostname and return its addresses only when **every** one of them is
 * public. Rejecting on any blocked answer closes the DNS-rebinding hole where a
 * name resolves to both a public and a private address.
 */
export async function resolvePublicIps(hostname: string): Promise<string[]> {
  const literal = normalizeIpLiteral(hostname);
  if (literal) {
    if (isBlockedIp(literal)) throw new Error(`Адрес заблокирован: ${hostname}`);
    return [literal];
  }

  const records = await lookupWithTimeout(hostname);
  if (records.length === 0) throw new Error(`Не удалось разрешить хост: ${hostname}`);
  for (const record of records) {
    if (isBlockedIp(record.address)) throw new Error(`Адрес заблокирован: ${hostname}`);
  }
  return records.map((r) => r.address);
}
