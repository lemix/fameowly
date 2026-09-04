import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  readModelsConfig,
  filterModelsForRole,
  stripPricingForRole,
  saveModelsConfig,
} from "@/lib/models.server";
import type { ModelsConfig } from "@/lib/models";

/** GET /api/models — return the current models config (from data/models.json) */
export async function GET() {
  const headersList = await headers();
  const role = headersList.get("x-user-role");
  const config = readModelsConfig();
  const filtered = filterModelsForRole(config, role);
  return NextResponse.json(stripPricingForRole(filtered, role));
}

/** PUT /api/models — overwrite models config (admin only) */
export async function PUT(req: NextRequest) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as ModelsConfig;

    if (!Array.isArray(body.chatModels) || !Array.isArray(body.imageModels)) {
      return NextResponse.json(
        { error: "Неверный формат: chatModels и imageModels обязательны" },
        { status: 400 },
      );
    }

    // Validate each model has required fields
    for (const m of [...body.chatModels, ...body.imageModels]) {
      if (!m.id || !m.name || !m.provider || !m.tier) {
        return NextResponse.json(
          { error: `Модель без обязательных полей: ${JSON.stringify(m)}` },
          { status: 400 },
        );
      }
    }

    saveModelsConfig(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Ошибка сохранения моделей" },
      { status: 500 },
    );
  }
}
