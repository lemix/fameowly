import { NextResponse } from "next/server";
import { readModelsConfig } from "@/lib/models.server";

/** GET /api/models — return the current models config (from data/models.json) */
export async function GET() {
  const config = readModelsConfig();
  return NextResponse.json(config);
}
