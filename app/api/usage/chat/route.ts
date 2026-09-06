import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/plugins";

/** Delegates per-chat consumption stats to the billing plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("usage-chat", "GET");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}
