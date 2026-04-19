/**
 * Usage API — returns paginated token usage records for the authenticated user.
 * Available to all authenticated users (each user sees only their own data).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getUserUsagePaginated } from "@/lib/usage-store";

const COOKIE_NAME = "session";
const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10)));

  const result = getUserUsagePaginated(session.userId, page, pageSize);

  return NextResponse.json({
    records: result.records,
    total: result.total,
    page,
    pageSize,
    totalPages: result.totalPages,
  });
}
