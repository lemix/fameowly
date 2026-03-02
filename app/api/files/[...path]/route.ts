import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const COOKIE_NAME = "session";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Auth check
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { path: segments } = await params;
  const relativePath = segments.join("/");

  // Security: prevent directory traversal
  const resolved = path.resolve(UPLOADS_DIR, relativePath);
  if (!resolved.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(resolved);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
