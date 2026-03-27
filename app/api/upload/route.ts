import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/chat-store";
import { resizeImageBuffer } from "@/lib/image-resize";

const COOKIE_NAME = "session";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (макс. 10MB)" },
        { status: 400 }
      );
    }

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type;
    let fileName = file.name;

    // Resize images on upload to save storage and reduce payload
    if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") {
      try {
        const resized = await resizeImageBuffer(buffer);
        buffer = Buffer.from(resized.buffer);
        if (resized.mimeType !== mimeType) {
          mimeType = resized.mimeType;
          fileName = fileName.replace(/\.[^.]+$/, ".jpg");
        }
      } catch {
        // Keep original on resize failure
      }
    }

    const url = saveUploadedFile(buffer, fileName, mimeType);

    return NextResponse.json({
      url,
      name: file.name,
      mimeType,
      type: mimeType.startsWith("image/") ? "image" : "file",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки файла" },
      { status: 500 }
    );
  }
}
