import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/games/[gameId] — Получение игры по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      include: {
        host: {
          select: { id: true, name: true, avatar: true },
        },
        players: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, level: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Игра не найдена" },
        { status: 404 }
      );
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Ошибка получения игры:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
