import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  getImageHistory,
  deleteImageHistoryItem,
} from "@/lib/image-store";

const COOKIE_NAME = "session";

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session?.userId ?? null;
}

// GET /api/images — list image history
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const history = getImageHistory(userId);
  return NextResponse.json({ history });
}

// DELETE /api/images — delete an image history item
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  const deleted = deleteImageHistoryItem(userId, id);
  if (!deleted)
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  return NextResponse.json({ success: true });
}
