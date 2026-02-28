import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// ------- Types -------
export interface User {
  id: string;
  name: string;
  password: string; // bcrypt-like hash (we use sha256 for simplicity)
  role: "admin" | "user";
}

export interface SessionPayload {
  userId: string;
  name: string;
  role: "admin" | "user";
}

// ------- Constants -------
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me-please-32chars"
);
const COOKIE_NAME = "session";

// ------- Password helpers -------
export function hashPassword(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return hashPassword(plain) === hashed;
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
  return JSON.parse(raw) as User[];
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
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET_KEY);
  return token;
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
