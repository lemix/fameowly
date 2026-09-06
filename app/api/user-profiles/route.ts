import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/plugins";

/** Delegates per-user plan and tag assignment to the billing plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("user-profiles", "GET");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}

export async function PATCH(req: NextRequest) {
  const handler = getPluginRoute("user-profiles", "PATCH");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}
