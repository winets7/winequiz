import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

/** Маппинг расширений → MIME типы */
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * GET /api/uploads/[...path] — Раздача загруженных файлов
 * Например: /api/uploads/rounds/abc123/photo-1.jpg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { error: "Путь не указан" },
        { status: 400 }
      );
    }

    // Защита от path traversal
    const safePath = pathSegments.map((s) =>
      s.replace(/\.\./g, "").replace(/[^a-zA-Z0-9._-]/g, "")
    );

    const filePath = path.join(process.cwd(), "uploads", ...safePath);

    // Проверяем что файл внутри uploads/
    const uploadsRoot = path.join(process.cwd(), "uploads");
    if (!filePath.startsWith(uploadsRoot)) {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    // Проверяем существование файла
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json(
        { error: "Файл не найден" },
        { status: 404 }
      );
    }

    // Определяем MIME тип
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Читаем и отдаём файл
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Ошибка раздачи файла:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    );
  }
}
