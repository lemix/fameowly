import sharp from "sharp";

/** Max dimension for chat images (longest side in px) */
const MAX_CHAT_IMAGE_DIM = 1280;
const CHAT_IMAGE_QUALITY = 80;

/**
 * Resize an image buffer so its longest side <= maxDimension.
 * Outputs JPEG for smaller file size.
 */
export async function resizeImageBuffer(
  buffer: Buffer,
  maxDimension = MAX_CHAT_IMAGE_DIM,
  quality = CHAT_IMAGE_QUALITY
): Promise<{ buffer: Buffer; mimeType: string }> {
  const meta = await sharp(buffer).metadata();

  // Skip SVGs — can't/shouldn't rasterize
  if (meta.format === "svg") {
    return { buffer, mimeType: "image/svg+xml" };
  }

  const w = meta.width || 0;
  const h = meta.height || 0;

  const needsResize = w > maxDimension || h > maxDimension;

  let pipeline = sharp(buffer);
  if (needsResize) {
    pipeline = pipeline.resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const out = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  return { buffer: out, mimeType: "image/jpeg" };
}

/**
 * Resize a base64-encoded image. Returns resized base64 + mimeType.
 */
export async function resizeBase64Image(
  base64Data: string,
  mimeType: string,
  maxDimension = MAX_CHAT_IMAGE_DIM,
  quality = CHAT_IMAGE_QUALITY
): Promise<{ data: string; mimeType: string }> {
  if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") {
    return { data: base64Data, mimeType };
  }

  const inputBuf = Buffer.from(base64Data, "base64");
  const { buffer, mimeType: outMime } = await resizeImageBuffer(
    inputBuf,
    maxDimension,
    quality
  );
  return { data: buffer.toString("base64"), mimeType: outMime };
}

/**
 * Resize an image to a target longest-side dimension (can upscale).
 * Used for generated images when the user requests a specific resolution.
 */
export async function resizeToTarget(
  buffer: Buffer,
  longestSide: number
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;

  if (Math.max(w, h) === longestSide) return buffer;

  let targetW: number;
  let targetH: number;
  if (w >= h) {
    targetW = longestSide;
    targetH = Math.round((h / w) * longestSide);
  } else {
    targetH = longestSide;
    targetW = Math.round((w / h) * longestSide);
  }

  return sharp(buffer)
    .resize(targetW, targetH, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();
}
