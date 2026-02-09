import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGameCode } from "@/lib/game-code";

/**
 * POST /api/games — Создание новой игровой сессии
 *
 * Body: {
 *   hostId: string       — ID хоста (пользователя)
 *   totalRounds?: number — количество раундов (по умолч. 10)
 *   maxPlayers?: number  — макс. игроков (по умолч. 99)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostId, totalRounds = 10, maxPlayers = 99 } = body;

    if (!hostId) {
      return NextResponse.json(
        { error: "hostId обязателен" },
        { status: 400 }
      );
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: hostId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Генерируем уникальный код комнаты
    let code = generateGameCode();
    let codeExists = true;
    let attempts = 0;

    while (codeExists && attempts < 10) {
      const existing = await prisma.gameSession.findUnique({
        where: { code },
      });
      if (!existing) {
        codeExists = false;
      } else {
        code = generateGameCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: "Не удалось сгенерировать уникальный код" },
        { status: 500 }
      );
    }

    // Выбираем случайные вопросы для игры
    const questions = await prisma.question.findMany({
      include: { answers: true },
      take: totalRounds,
      orderBy: { createdAt: "asc" },
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Нет доступных вопросов в базе данных" },
        { status: 400 }
      );
    }

    // Создаём игровую сессию
    const game = await prisma.gameSession.create({
      data: {
        hostId,
        code,
        maxPlayers: Math.min(maxPlayers, 99),
        totalRounds: Math.min(questions.length, totalRounds),
        status: "WAITING",
        currentRound: 0,
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Автоматически добавляем хоста как игрока
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: hostId,
      },
    });

    return NextResponse.json({
      game: {
        id: game.id,
        code: game.code,
        status: game.status,
        maxPlayers: game.maxPlayers,
        totalRounds: game.totalRounds,
        host: game.host,
        questionsCount: questions.length,
      },
    });
  } catch (error) {
    console.error("Ошибка создания игры:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/games?code=WN-XXXXXX — Получение игры по коду
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Код комнаты обязателен" },
        { status: 400 }
      );
    }

    const game = await prisma.gameSession.findUnique({
      where: { code },
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
