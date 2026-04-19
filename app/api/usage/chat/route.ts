import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserUsage } from "@/lib/usage-store";

/**
 * GET /api/usage/chat?chatId=xxx
 * Returns aggregated token usage for a specific chat, including
 * the last request's prompt tokens (≈ current context window size).
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const chatId = url.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }

  const allRecords = getUserUsage(session.userId);
  const chatRecords = allRecords.filter((r) => r.chatId === chatId);

  const totalTokens = chatRecords.reduce((s, r) => s + r.totalTokens, 0);
  const totalCost = chatRecords.reduce((s, r) => s + r.cost, 0);

  // Last request's prompt tokens ≈ current context window size
  const lastRecord = chatRecords.length > 0 ? chatRecords[chatRecords.length - 1] : null;
  const lastContextTokens = lastRecord?.promptTokens ?? 0;

  return NextResponse.json({
    totalTokens,
    totalCost,
    requestCount: chatRecords.length,
    lastContextTokens,
  });
}
