import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getChat } from "@/lib/chat-store";

const COOKIE_NAME = "session";

/**
 * GET /api/chats/usage?chatId=xxx — token aggregate of one chat.
 *
 * `contextStale` means messages were deleted after the last measurement,
 * so the context size is no longer exact.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId обязателен" }, { status: 400 });
  }

  const chat = getChat(session.userId, chatId);
  const usage = chat?.usage;

  return NextResponse.json({
    promptTokens: usage?.promptTokens ?? 0,
    completionTokens: usage?.completionTokens ?? 0,
    requests: usage?.requests ?? 0,
    contextTokens: usage?.contextTokens ?? 0,
    contextStale: usage ? usage.contextRevision !== (chat?.revision ?? 0) : false,
  });
}
