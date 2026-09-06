import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DATA_DIR } from "./paths";

// ------- Types -------
export type UserRole = "admin" | "user";

export interface User {
  id: string;
  name: string;
  /** "salt:hash" (scrypt); bare hex is a legacy unsalted sha256 */
  password: string;
  role: UserRole;
  /** Bumped on role or password change to invalidate issued tokens */
  sessionVersion?: number;
}

export interface SessionPayload {
  userId: string;
  name: string;
  role: UserRole;
  sessionVersion?: number;
}

// ------- Constants -------
const USERS_FILE = path.join(DATA_DIR, "users.json");
const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me-please-32chars"
);
const COOKIE_NAME = "session";

// ------- Password helpers -------
const SCRYPT_KEYLEN = 32;

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/** True for pre-salt hashes that should be upgraded on next successful login */
export function isLegacyHash(stored: string): boolean {
  return !stored.includes(":");
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (isLegacyHash(stored)) {
    const legacy = crypto.createHash("sha256").update(plain).digest("hex");
    return timingSafeEqualHex(legacy, stored);
  }

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return timingSafeEqualHex(candidate, hash);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ------- Users JSON helpers -------
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o755 });
  }
}

function ensureUsersFile(): void {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    const adminPass = process.env.ADMIN_INIT_PASS || "admin123";
    const seed: User[] = [
      {
        id: "1",
        name: "Admin",
        password: hashPassword(adminPass),
        role: "admin",
        sessionVersion: 1,
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seed, null, 2), {
      mode: 0o644,
    });
  }
}

export function getUsers(): User[] {
  ensureUsersFile();
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  const users = JSON.parse(raw) as User[];
  // Retired roles (family, client) collapse into the plain user role
  return users.map((u) => ({ ...u, role: u.role === "admin" ? "admin" : "user" }));
}

export function saveUsers(users: User[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function findUserByName(name: string): User | undefined {
  return getUsers().find(
    (u) => u.name.toLowerCase() === name.toLowerCase()
  );
}

export function findUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

// ------- JWT / Session helpers -------
export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion ?? 1,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET_KEY);
  return token;
}

/**
 * Resolve a token to the stored user.
 *
 * The JWT lives for a week, so its role is only a hint: a demoted admin would
 * keep admin rights until the token expires. Every privileged path must go
 * through here, which re-reads the user and rejects superseded sessions.
 */
export async function authorize(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const user = findUserById(session.userId);
  if (!user) return null;
  if ((user.sessionVersion ?? 1) !== (session.sessionVersion ?? 1)) return null;

  return user;
}

/** Same as `authorize`, but also requires the admin role */
export async function authorizeAdmin(token: string | undefined): Promise<User | null> {
  const user = await authorize(token);
  return user?.role === "admin" ? user : null;
}

/** Invalidate every token issued for this user */
export function bumpSessionVersion(user: User): void {
  user.sessionVersion = (user.sessionVersion ?? 1) + 1;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
