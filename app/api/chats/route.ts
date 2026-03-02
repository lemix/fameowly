import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  getUserChats,
  getChat,
  createChat,
  updateChat,
  deleteChat,
  deleteMessage,
} from "@/lib/chat-store";

const COOKIE_NAME = "session";

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session?.userId ?? null;
}

// GET /api/chats — list all chats OR get one chat by ?id=xxx
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const chatId = request.nextUrl.searchParams.get("id");

  if (chatId) {
    const chat = getChat(userId, chatId);
    if (!chat)
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    return NextResponse.json({ chat });
  }

  const chats = getUserChats(userId);
  return NextResponse.json({ chats });
}

// POST /api/chats — create new chat
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { modelId, title, systemPrompt } = body as { modelId: string; title?: string; systemPrompt?: string };

  if (!modelId) {
    return NextResponse.json(
      { error: "modelId обязателен" },
      { status: 400 }
    );
  }

  const chat = createChat(userId, modelId, title, systemPrompt);
  return NextResponse.json({ chat });
}

// PATCH /api/chats — update chat (rename, update messages)
export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { chatId, title, messages, modelId, deleteMessageId, systemPrompt } = body;

  if (!chatId) {
    return NextResponse.json(
      { error: "chatId обязателен" },
      { status: 400 }
    );
  }

  // Delete single message
  if (deleteMessageId) {
    const chat = deleteMessage(userId, chatId, deleteMessageId);
    if (!chat)
      return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    return NextResponse.json({ chat });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (messages !== undefined) updates.messages = messages;
  if (modelId !== undefined) updates.modelId = modelId;
  if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;

  const chat = updateChat(userId, chatId, updates);
  if (!chat)
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  return NextResponse.json({ chat });
}

// DELETE /api/chats — delete a chat
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const { chatId } = body as { chatId: string };

  if (!chatId) {
    return NextResponse.json(
      { error: "chatId обязателен" },
      { status: 400 }
    );
  }

  const deleted = deleteChat(userId, chatId);
  if (!deleted)
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  return NextResponse.json({ success: true });
}
