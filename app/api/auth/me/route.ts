import { NextRequest, NextResponse } from "next/server";
import { verifySession, findUserById } from "@/lib/auth";

const COOKIE_NAME = "session";

/** GET /api/auth/me — return current user info (id, name, role) */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
  });
}
