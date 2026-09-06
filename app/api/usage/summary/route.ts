import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/plugins";

/** Delegates month-to-date consumption per user to the billing plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("usage-summary", "GET");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}
