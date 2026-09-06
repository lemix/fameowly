import { NextResponse } from "next/server";
import { hasPlugins, getPlugins, getAdminTabs, getUiSlots } from "@/lib/plugins";

export async function GET() {
  return NextResponse.json({
    hasPlugins: hasPlugins(),
    plugins: getPlugins().map((p) => p.id),
    adminTabs: getAdminTabs(),
    uiSlots: getUiSlots(),
  });
}
