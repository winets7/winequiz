import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidGameCode } from "@/lib/game-code";

/**
 * POST /api/games/join — Присоединение к игре
 *
 * Body: {
 *   code: string    — код комнаты (WN-XXXXXX)
 *   userId: string  — ID пользователя
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code || !userId) {
      return NextResponse.json(
        { error: "code и userId обязательны" },
        { status: 400 }
      );
    }

    if (!isValidGameCode(code)) {
      return NextResponse.json(
        { error: "Неверный формат кода комнаты" },
        { status: 400 }
      );
    }

    // Находим игру
    const game = await prisma.gameSession.findUnique({
      where: { code },
      include: {
        players: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Игра не найдена" },
        { status: 404 }
      );
    }

    if (game.status !== "WAITING") {
      return NextResponse.json(
        { error: "Игра уже началась или завершена" },
        { status: 400 }
      );
    }

    if (game.players.length >= game.maxPlayers) {
      return NextResponse.json(
        { error: "Комната заполнена" },
        { status: 400 }
      );
    }

    // Проверяем, не подключён ли уже игрок
    const existingPlayer = game.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      return NextResponse.json({
        gamePlayer: existingPlayer,
        message: "Вы уже в игре",
      });
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Добавляем игрока
    const gamePlayer = await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, level: true },
        },
      },
    });

    return NextResponse.json({ gamePlayer });
  } catch (error) {
    console.error("Ошибка подключения к игре:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
