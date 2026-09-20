import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads")
);

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  const relativePath = segments.join("/");
  const filePath = path.resolve(UPLOAD_ROOT, relativePath);

  const relative = path.relative(UPLOAD_ROOT, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const data = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
