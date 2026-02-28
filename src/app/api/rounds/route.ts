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
    const gameId = body.gameId as string | undefined;
    const roundNumber = body.roundNumber != null ? Number(body.roundNumber) : NaN;
    const grapeVarieties = body.grapeVarieties;
    const sweetness = body.sweetness;
    const vintageYear = body.vintageYear;
    const country = body.country;
    const alcoholContent = body.alcoholContent;
    const isOakAged = body.isOakAged;
    const color = body.color;
    const composition = body.composition;

    if (!gameId || Number.isNaN(roundNumber)) {
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

    console.log("[POST /api/rounds] payload:", { gameId, roundNumber, color, sweetness, composition, grapeVarieties, country, vintageYear, alcoholContent, isOakAged });

    const round = await prisma.round.upsert({
      where: {
        gameId_roundNumber: { gameId, roundNumber: Math.floor(roundNumber) },
      },
      update: {
        grapeVarieties: Array.isArray(grapeVarieties) ? grapeVarieties : [],
        sweetness: sweetness != null && sweetness !== "" ? sweetness : null,
        vintageYear: vintageYear != null && vintageYear !== "" ? parseInt(String(vintageYear), 10) : null,
        country: country != null && country !== "" ? country : null,
        alcoholContent: alcoholContent != null && alcoholContent !== "" ? parseFloat(String(alcoholContent)) : null,
        isOakAged: isOakAged === undefined ? null : isOakAged,
        color: color != null && color !== "" ? color : null,
        composition: composition != null && composition !== "" ? composition : null,
        status: roundStatus,
      },
      create: {
        gameId,
        roundNumber: Math.floor(roundNumber),
        grapeVarieties: Array.isArray(grapeVarieties) ? grapeVarieties : [],
        sweetness: sweetness != null && sweetness !== "" ? sweetness : null,
        vintageYear: vintageYear != null && vintageYear !== "" ? parseInt(String(vintageYear), 10) : null,
        country: country != null && country !== "" ? country : null,
        alcoholContent: alcoholContent != null && alcoholContent !== "" ? parseFloat(String(alcoholContent)) : null,
        isOakAged: isOakAged === undefined ? null : isOakAged,
        color: color != null && color !== "" ? color : null,
        composition: composition != null && composition !== "" ? composition : null,
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
