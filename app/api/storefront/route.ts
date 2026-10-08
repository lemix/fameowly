import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/plugins";

/** Delegates the storefront catalogue and public texts to the storefront plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("storefront", "GET");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}

export async function PUT(req: NextRequest) {
  const handler = getPluginRoute("storefront", "PUT");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}
