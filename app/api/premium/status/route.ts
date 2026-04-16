import { NextResponse } from "next/server";
import { hasPremium, getPlugins, getAdminTabs } from "@/lib/premium";

export async function GET() {
  return NextResponse.json({
    premium: hasPremium(),
    plugins: getPlugins().map((p) => p.id),
    adminTabs: getAdminTabs(),
  });
}
