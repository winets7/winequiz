import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/rounds/[roundId]/photos — Загрузка фотографий бутылки
 * Принимает multipart/form-data с файлами
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;

    // Проверяем существование раунда
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return NextResponse.json(
        { error: "Раунд не найден" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Нет файлов для загрузки" },
        { status: 400 }
      );
    }

    if (files.length > 4) {
      return NextResponse.json(
        { error: "Максимум 4 фотографии" },
        { status: 400 }
      );
    }

    // Создаём директорию для загрузки
    const uploadDir = path.join(process.cwd(), "uploads", "rounds", roundId);
    await mkdir(uploadDir, { recursive: true });

    const savedPhotos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Валидация типа файла
      if (!file.type.startsWith("image/")) {
        continue;
      }

      // Ограничение размера (10MB)
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `photo-${i + 1}-${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      // Сохраняем файл
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      // URL для доступа через API
      const imageUrl = `/api/uploads/rounds/${roundId}/${fileName}`;

      // Сохраняем запись в БД
      const photo = await prisma.roundPhoto.create({
        data: {
          roundId,
          imageUrl,
          sortOrder: i,
        },
      });

      savedPhotos.push(photo);
    }

    return NextResponse.json({
      photos: savedPhotos,
      count: savedPhotos.length,
    });
  } catch (error) {
    console.error("Ошибка загрузки фото:", error);
    return NextResponse.json(
      { error: "Ошибка при загрузке фотографий" },
      { status: 500 }
    );
  }
}
