/**
 * Usage API — returns usage records grouped into months and weeks.
 *
 * Each user sees only their own data; admins may request another user's
 * records via the `userId` query parameter.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getUserUsage } from "@/lib/usage-store";
import { listUsageMonths, buildMonthView } from "@/lib/usage-periods";

const COOKIE_NAME = "session";

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
  const requestedUserId = searchParams.get("userId");
  if (
    requestedUserId &&
    requestedUserId !== session.userId &&
    session.role !== "admin"
  ) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const records = getUserUsage(requestedUserId || session.userId);
  const months = listUsageMonths(records);
  const requested = searchParams.get("month");
  const month =
    requested && months.some((m) => m.key === requested)
      ? requested
      : months[0]?.key;

  return NextResponse.json({
    months,
    view: month ? buildMonthView(records, month) : null,
  });
}
