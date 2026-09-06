import { NextRequest, NextResponse } from "next/server";
import {
  authorize,
  getUsers,
  saveUsers,
  hashPassword,
  verifyPassword,
  bumpSessionVersion,
  createSession,
} from "@/lib/auth";

const COOKIE_NAME = "session";
const MIN_LENGTH = 6;

/** POST /api/auth/password — change your own password */
export async function POST(request: NextRequest) {
  const account = await authorize(request.cookies.get(COOKIE_NAME)?.value);
  if (!account) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Укажите текущий и новый пароль" },
      { status: 400 }
    );
  }
  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `Минимальная длина пароля — ${MIN_LENGTH} символов` },
      { status: 400 }
    );
  }

  const users = getUsers();
  const user = users.find((u) => u.id === account.id);
  if (!user || !verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 403 });
  }

  user.password = hashPassword(newPassword);
  bumpSessionVersion(user);
  saveUsers(users);

  // Re-issue the caller's own session so the password change does not log them out
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, await createSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
