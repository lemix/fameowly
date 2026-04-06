import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { readModelsConfig, filterModelsForRole } from "@/lib/models.server";

/** GET /api/models — return the current models config (from data/models.json) */
export async function GET() {
  const headersList = await headers();
  const role = headersList.get("x-user-role");
  const config = readModelsConfig();
  const filtered = filterModelsForRole(config, role);
  return NextResponse.json(filtered);
}
