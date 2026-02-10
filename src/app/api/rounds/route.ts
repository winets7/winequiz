import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/rounds — Создание раунда (хост задаёт параметры вина)
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

    // Проверяем что игра существует и в статусе PLAYING
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Игра не найдена" },
        { status: 404 }
      );
    }

    if (game.status !== "PLAYING") {
      return NextResponse.json(
        { error: "Игра не в статусе PLAYING" },
        { status: 400 }
      );
    }

    if (roundNumber > game.totalRounds) {
      return NextResponse.json(
        { error: "Номер раунда превышает общее количество" },
        { status: 400 }
      );
    }

    // Создаём или обновляем раунд
    const round = await prisma.round.upsert({
      where: {
        gameId_roundNumber: { gameId, roundNumber },
      },
      update: {
        grapeVarieties: grapeVarieties || [],
        sweetness: sweetness || null,
        vintageYear: vintageYear ? parseInt(vintageYear) : null,
        country: country || null,
        alcoholContent: alcoholContent ? parseFloat(alcoholContent) : null,
        isOakAged: isOakAged ?? null,
        color: color || null,
        composition: composition || null,
        status: "ACTIVE",
      },
      create: {
        gameId,
        roundNumber,
        grapeVarieties: grapeVarieties || [],
        sweetness: sweetness || null,
        vintageYear: vintageYear ? parseInt(vintageYear) : null,
        country: country || null,
        alcoholContent: alcoholContent ? parseFloat(alcoholContent) : null,
        isOakAged: isOakAged ?? null,
        color: color || null,
        composition: composition || null,
        status: "ACTIVE",
      },
    });

    // Обновляем текущий раунд в игре
    await prisma.gameSession.update({
      where: { id: gameId },
      data: { currentRound: roundNumber },
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
