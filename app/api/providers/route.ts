import { NextRequest, NextResponse } from "next/server";
import { getPluginRoute } from "@/lib/premium";

/** Delegates all provider CRUD to the providers plugin. */

export async function GET(req: NextRequest) {
  const handler = getPluginRoute("providers", "GET");
  if (!handler) return NextResponse.json({ error: "Premium not available" }, { status: 404 });
  return handler(req);
}

export async function POST(req: NextRequest) {
  const handler = getPluginRoute("providers", "POST");
  if (!handler) return NextResponse.json({ error: "Premium not available" }, { status: 404 });
  return handler(req);
}

export async function DELETE(req: NextRequest) {
  const handler = getPluginRoute("providers", "DELETE");
  if (!handler) return NextResponse.json({ error: "Premium not available" }, { status: 404 });
  return handler(req);
}
