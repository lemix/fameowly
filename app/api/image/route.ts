import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { readModelsConfig } from "@/lib/models.server";
import {
  addImageHistoryItem,
  saveGeneratedImage,
} from "@/lib/image-store";
import type { ImageHistoryItem } from "@/lib/image-store";

export const maxDuration = 120;

const COOKIE_NAME = "session";

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session?.userId ?? null;
}

/** Read a reference image URL and return base64 + mimeType */
function resolveReferenceImage(
  refUrl: string
): { data: string; mimeType: string } | null {
  try {
    if (refUrl.startsWith("data:")) {
      const match = refUrl.match(/^data:(.*?);base64,(.*)$/);
      if (match) return { mimeType: match[1], data: match[2] };
    } else if (refUrl.startsWith("/api/files/")) {
      const relativePath = refUrl.replace("/api/files/", "");
      const filePath = path.join(process.cwd(), "data", "uploads", relativePath);
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      return { data: buffer.toString("base64"), mimeType };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { prompt, model, referenceImageUrl } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const { imageModels } = readModelsConfig();
    const modelId = model || imageModels[0]?.id;
    const modelInfo =
      imageModels.find((m) => m.id === modelId) || imageModels[0];

    if (!modelInfo) {
      return NextResponse.json(
        { error: "Нет доступных моделей для генерации изображений" },
        { status: 400 }
      );
    }

    // Build history item shell
    const historyItem: ImageHistoryItem = {
      id: `img-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      prompt: prompt.trim(),
      imageUrl: null,
      modelId: modelInfo.id,
      modelName: modelInfo.name,
      createdAt: new Date().toISOString(),
    };

    if (modelInfo.provider === "google") {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Google API key not configured" },
          { status: 500 }
        );
      }

      // Build parts (text + optional reference image)
      const parts: Array<Record<string, unknown>> = [{ text: prompt }];

      if (referenceImageUrl) {
        const ref = resolveReferenceImage(referenceImageUrl);
        if (ref) {
          parts.push({
            inlineData: { mimeType: ref.mimeType, data: ref.data },
          });
        }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Google image generation error:", errBody);
        let errorMsg = "Ошибка генерации изображения";
        try {
          const errJson = JSON.parse(errBody);
          if (errJson.error?.message) {
            errorMsg = errJson.error.message;
          }
        } catch {
          // use default error
        }
        historyItem.error = errorMsg;
        addImageHistoryItem(userId, historyItem);
        return NextResponse.json(
          { error: errorMsg, historyItem },
          { status: response.status }
        );
      }

      const data = await response.json();
      const resParts = data?.candidates?.[0]?.content?.parts;

      if (!resParts || resParts.length === 0) {
        historyItem.error = "Модель не вернула ответ";
        addImageHistoryItem(userId, historyItem);
        return NextResponse.json(
          { error: "Модель не вернула ответ", historyItem },
          { status: 500 }
        );
      }

      const imagePart = resParts.find(
        (p: Record<string, unknown>) =>
          p.inlineData &&
          typeof (p.inlineData as Record<string, unknown>).data === "string"
      );

      if (imagePart?.inlineData) {
        const { mimeType, data: b64 } = imagePart.inlineData as {
          mimeType: string;
          data: string;
        };

        // Save to disk instead of returning base64
        const imageUrl = saveGeneratedImage(b64, mimeType);
        historyItem.imageUrl = imageUrl;

        const textPart = resParts.find(
          (p: Record<string, unknown>) => typeof p.text === "string"
        );
        const description = textPart?.text || undefined;

        addImageHistoryItem(userId, historyItem);
        return NextResponse.json({ imageUrl, description, historyItem });
      }

      const textPart = resParts.find(
        (p: Record<string, unknown>) => typeof p.text === "string"
      );
      if (textPart?.text) {
        const errMsg = `Модель ответила текстом: ${textPart.text}`;
        historyItem.error = errMsg;
        addImageHistoryItem(userId, historyItem);
        return NextResponse.json(
          { error: errMsg, historyItem },
          { status: 422 }
        );
      }

      historyItem.error = "Модель не вернула изображение";
      addImageHistoryItem(userId, historyItem);
      return NextResponse.json(
        { error: "Модель не вернула изображение", historyItem },
        { status: 500 }
      );
    }

    // Fallback: OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          prompt,
          n: 1,
          size: "1024x1024",
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Image generation error:", errBody);
      historyItem.error = "Ошибка генерации изображения";
      addImageHistoryItem(userId, historyItem);
      return NextResponse.json(
        { error: "Ошибка генерации изображения", historyItem },
        { status: response.status }
      );
    }

    const data = await response.json();
    let imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;

    // If it's base64, save to disk
    if (imageUrl && imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        imageUrl = saveGeneratedImage(match[2], match[1]);
      }
    }

    historyItem.imageUrl = imageUrl || null;
    addImageHistoryItem(userId, historyItem);
    return NextResponse.json({ imageUrl, historyItem });
  } catch (error) {
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
