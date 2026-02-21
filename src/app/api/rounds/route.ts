import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/rounds?gameId=xxx — Получить все раунды игры
 */
export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get("gameId");
    if (!gameId) {
      return NextResponse.json({ error: "gameId обязателен" }, { status: 400 });
    }

    const rounds = await prisma.round.findMany({
      where: { gameId },
      include: { photos: { orderBy: { sortOrder: "asc" } } },
      orderBy: { roundNumber: "asc" },
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error("Ошибка получения раундов:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rounds — Создание/обновление раунда (хост задаёт параметры вина)
 * Разрешено в статусах WAITING и PLAYING
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameId,
      roundNumber,
      grapeVarieties,
      sweetness,
      vintageYear,
      country,
      alcoholContent,
      isOakAged,
      color,
      composition,
    } = body;

    if (!gameId || !roundNumber) {
      return NextResponse.json(
        { error: "gameId и roundNumber обязательны" },
        { status: 400 }
      );
    }

    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Игра не найдена" },
        { status: 404 }
      );
    }

    // Разрешаем создание раундов в WAITING (подготовка) и PLAYING
    if (game.status !== "WAITING" && game.status !== "PLAYING") {
      return NextResponse.json(
        { error: "Игра уже завершена" },
        { status: 400 }
      );
    }

    if (roundNumber > game.totalRounds) {
      return NextResponse.json(
        { error: "Номер раунда превышает общее количество" },
        { status: 400 }
      );
    }

    // Раунды в лобби создаются как CREATED (ещё не активированы)
    const roundStatus = game.status === "WAITING" ? "CREATED" : "ACTIVE";

    const round = await prisma.round.upsert({
      where: {
        gameId_roundNumber: { gameId, roundNumber },
      },
      update: {
        grapeVarieties: grapeVarieties || [],
        sweetness: sweetness || null,
        vintageYear: vintageYear ? parseInt(String(vintageYear)) : null,
        country: country || null,
        alcoholContent: alcoholContent ? parseFloat(String(alcoholContent)) : null,
        isOakAged: isOakAged ?? null,
        color: color || null,
        composition: composition || null,
        status: roundStatus,
      },
      create: {
        gameId,
        roundNumber,
        grapeVarieties: grapeVarieties || [],
        sweetness: sweetness || null,
        vintageYear: vintageYear ? parseInt(String(vintageYear)) : null,
        country: country || null,
        alcoholContent: alcoholContent ? parseFloat(String(alcoholContent)) : null,
        isOakAged: isOakAged ?? null,
        color: color || null,
        composition: composition || null,
        status: roundStatus,
      },
    });

    return NextResponse.json({ round });
  } catch (error) {
    console.error("Ошибка создания раунда:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
