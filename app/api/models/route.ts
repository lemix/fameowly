import { NextRequest, NextResponse } from "next/server";
import { authorize, authorizeAdmin } from "@/lib/auth";
import { initializeContainer, container } from "@/lib/plugin-loader";
import {
  readModelsConfig,
  stripPricingForNonAdmin,
  saveModelsConfig,
} from "@/lib/models.server";
import type { ModelsConfig } from "@/lib/models";

initializeContainer();

const COOKIE_NAME = "session";

/** GET /api/models — the catalogue this user may choose from */
export async function GET(req: NextRequest) {
  const user = await authorize(req.cookies.get(COOKIE_NAME)?.value);
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const config = container.get("modelAccessPolicy").filter(user.id, readModelsConfig());
  return NextResponse.json(stripPricingForNonAdmin(config, user.role === "admin"));
}

/** PUT /api/models — overwrite models config (admin only) */
export async function PUT(req: NextRequest) {
  const admin = await authorizeAdmin(req.cookies.get(COOKIE_NAME)?.value);
  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
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
