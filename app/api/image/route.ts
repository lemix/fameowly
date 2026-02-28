import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const modelId = model || "openai/dall-e-3";

    // Use OpenRouter for image generation
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
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
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Image generation error:", errBody);
      return NextResponse.json(
        { error: "Ошибка генерации изображения" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
