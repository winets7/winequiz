import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { filterPlayersExcludingHost } from "@/lib/game-host";

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

    return NextResponse.json({
      game: {
        ...game,
        players: filterPlayersExcludingHost(game.players, game.hostId),
      },
    });
  } catch (error) {
    console.error("Ошибка получения игры:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/games/[gameId] — Обновление игры (только хост, только WAITING)
 * Body: { totalRounds?: number } — количество раундов от 1 до 20
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const totalRounds = body.totalRounds != null ? Number(body.totalRounds) : undefined;

    if (totalRounds === undefined) {
      return NextResponse.json(
        { error: "totalRounds обязателен" },
        { status: 400 }
      );
    }

    if (totalRounds < 1 || totalRounds > 20) {
      return NextResponse.json(
        { error: "Количество раундов должно быть от 1 до 20" },
        { status: 400 }
      );
    }

    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      select: { id: true, hostId: true, status: true, totalRounds: true },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Игра не найдена" },
        { status: 404 }
      );
    }

    if (game.hostId !== userId) {
      return NextResponse.json(
        { error: "Только хост может изменять настройки игры" },
        { status: 403 }
      );
    }

    if (game.status !== "WAITING") {
      return NextResponse.json(
        { error: "Изменять количество раундов можно только пока игра ожидает старта" },
        { status: 400 }
      );
    }

    const updated = await prisma.gameSession.update({
      where: { id: gameId },
      data: { totalRounds },
    });

    return NextResponse.json({ game: updated });
  } catch (error) {
    console.error("Ошибка обновления игры:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
