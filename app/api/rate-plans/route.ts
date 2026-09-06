import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/plugins";

/** Delegates rate plan CRUD to the billing plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("rate-plans", "GET");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}

export async function POST(req: NextRequest) {
  const handler = getPluginRoute("rate-plans", "POST");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}

export async function DELETE(req: NextRequest) {
  const handler = getPluginRoute("rate-plans", "DELETE");
  if (!handler) return NextResponse.json({ error: "Plugin not available" }, { status: 404 });
  return handler(req);
}
