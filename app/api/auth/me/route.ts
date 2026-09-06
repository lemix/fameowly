import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/auth";

const COOKIE_NAME = "session";

/** GET /api/auth/me — current user; 401 once the session is superseded */
export async function GET(request: NextRequest) {
  const user = await authorize(request.cookies.get(COOKIE_NAME)?.value);
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
  });
}
