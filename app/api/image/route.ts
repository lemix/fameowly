import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { readModelsConfig } from "@/lib/models.server";
import { initializeContainer, container } from "@/lib/plugin-loader";
import { proxyFetch } from "@/lib/proxy-fetch";
import { resizeToTarget } from "@/lib/image-resize";
import { resolveFileUrl } from "@/lib/file-storage";
import { getVertexAccessToken } from "@/lib/providers/vertex-auth";
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

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { prompt, model, referenceFiles, aspectRatio, resolution } = await req.json();

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

    // Validate model access for client-role users
    const userRole = req.headers.get("x-user-role") || "user";
    if (userRole === "client" && !modelInfo.availableForClients) {
      return NextResponse.json(
        { error: "Модель недоступна" },
        { status: 403 }
      );
    }

    // Determine target resolution (longest side in px)
    const targetLongestSide =
      resolution === "4K" ? 4096 : resolution === "2K" ? 2048 : 0; // 0 = keep as-is

    // Build reference file list for history
    const refFilesForHistory = (referenceFiles as Array<{ url: string; name: string; mimeType: string }> | undefined)
      ?.map((f) => ({ url: f.url, name: f.name, mimeType: f.mimeType }));

    // Build history item shell
    const historyItem: ImageHistoryItem = {
      id: `img-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      prompt: prompt.trim(),
      imageUrl: null,
      modelId: modelInfo.id,
      modelName: modelInfo.name,
      createdAt: new Date().toISOString(),
      referenceFiles: refFilesForHistory,
      aspectRatio: aspectRatio || "1:1",
      resolution: resolution || "1K",
    };

    // Resolve credentials via virtual providers / .env fallback
    initializeContainer();

    const credentials = container.get("providerResolver").resolve(modelId, modelInfo.provider, userRole)!;

    if (modelInfo.provider === "google" || modelInfo.provider === "google-vertex") {
      const isVertex = modelInfo.provider === "google-vertex";

      // Build endpoint URL + auth headers depending on provider flavor.
      let endpoint: string;
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (isVertex) {
        try {
          const auth = await getVertexAccessToken({
            project: credentials.project,
            location: credentials.location,
            credentialsJson: credentials.credentialsJson,
          });
          headers["Authorization"] = `Bearer ${auth.token}`;
          const host =
            auth.location === "global"
              ? "https://aiplatform.googleapis.com"
              : `https://${auth.location}-aiplatform.googleapis.com`;
          endpoint =
            `${host}/v1/projects/${auth.project}/locations/${auth.location}` +
            `/publishers/google/models/${modelId}:generateContent`;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Vertex AI auth failed";
          historyItem.error = msg;
          addImageHistoryItem(userId, historyItem);
          return NextResponse.json({ error: msg, historyItem }, { status: 500 });
        }
      } else {
        const apiKey = credentials.apiKey;
        if (!apiKey) {
          return NextResponse.json(
            { error: "Google API key not configured" },
            { status: 500 }
          );
        }
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
      }

      // Build parts (text + optional reference files)
      // Include aspect ratio hint in the prompt for Gemini
      let enrichedPrompt = prompt;
      if (aspectRatio && aspectRatio !== "1:1") {
        enrichedPrompt = `${prompt}\n\n[Image aspect ratio: ${aspectRatio}]`;
      }
      const parts: Array<Record<string, unknown>> = [{ text: enrichedPrompt }];

      if (referenceFiles?.length) {
        for (const refFile of referenceFiles as Array<{ url: string; name: string; mimeType: string; type: string }>) {
          const ref = resolveFileUrl(refFile.url);
          if (ref) {
            if (ref.mimeType.startsWith("image/") || ref.mimeType === "application/pdf") {
              parts.push({
                inlineData: { mimeType: ref.mimeType, data: ref.data },
              });
            } else {
              // Text files: include content as text
              try {
                const textContent = Buffer.from(ref.data, "base64").toString("utf-8");
                parts.push({ text: `[Файл: ${refFile.name}]\n${textContent}` });
              } catch { /* skip */ }
            }
          }
        }
      }

      const response = await proxyFetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      });

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

        // Optionally resize to target resolution
        let finalB64 = b64;
        let finalMime = mimeType;
        if (targetLongestSide > 0) {
          try {
            const buf = Buffer.from(b64, "base64");
            const resized = await resizeToTarget(buf, targetLongestSide);
            finalB64 = resized.toString("base64");
            finalMime = "image/png";
          } catch {
            // Keep original on resize failure
          }
        }

        // Save to disk instead of returning base64
        const imageUrl = saveGeneratedImage(finalB64, finalMime);
        historyItem.imageUrl = imageUrl;

        const textPart = resParts.find(
          (p: Record<string, unknown>) => typeof p.text === "string"
        );
        const description = textPart?.text || undefined;

        addImageHistoryItem(userId, historyItem);
        container.get("usageTracker").onImageFinish(userId, modelId)
          .catch((err) => console.error("[usage-tracker] image finish error:", err));
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
    // Map aspect ratio to OpenRouter/DALL-E size parameter
    let imageSize = "1024x1024";
    if (aspectRatio === "16:9") imageSize = "1792x1024";
    else if (aspectRatio === "9:16") imageSize = "1024x1792";
    else if (aspectRatio === "4:3") imageSize = "1024x768";
    else if (aspectRatio === "3:4") imageSize = "768x1024";
    else if (aspectRatio === "3:2") imageSize = "1152x768";
    else if (aspectRatio === "2:3") imageSize = "768x1152";

    const response = await proxyFetch(
      "https://openrouter.ai/api/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          prompt,
          n: 1,
          size: imageSize,
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
    container.get("usageTracker").onImageFinish(userId, modelId)
      .catch((err) => console.error("[usage-tracker] image finish error:", err));
    return NextResponse.json({ imageUrl, historyItem });
  } catch (error) {
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
