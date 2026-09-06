import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/plugins";

/** Delegates the admin finance report (and its CSV export) to the billing plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("finance", "GET");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}
