import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/games/[gameId]/history?userId=xxx — Получение истории ответов пользователя в игре
 *
 * Возвращает:
 * - Информацию об игре
 * - Все раунды с правильными ответами
 * - Ответы пользователя по каждому раунду
 * - Фотографии бутылок
 * - Баллы за каждый раунд
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId обязателен" },
        { status: 400 }
      );
    }

    // Проверяем существование игры
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        code: true,
        status: true,
        totalRounds: true,
        createdAt: true,
        finishedAt: true,
        host: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Игра не найдена" },
        { status: 404 }
      );
    }

    // Проверяем, участвовал ли пользователь в игре
    const gamePlayer = await prisma.gamePlayer.findUnique({
      where: {
        gameId_userId: { gameId, userId },
      },
      select: {
        id: true,
        score: true,
        position: true,
      },
    });

    if (!gamePlayer) {
      return NextResponse.json(
        { error: "Вы не участвовали в этой игре" },
        { status: 403 }
      );
    }

    // Получаем только завершенные раунды игры
    const rounds = await prisma.round.findMany({
      where: { 
        gameId,
        status: "CLOSED", // Показываем только завершенные раунды
      },
      include: {
        photos: {
          orderBy: { sortOrder: "asc" },
          select: { imageUrl: true },
        },
        guesses: {
          where: {
            gamePlayerId: gamePlayer.id,
          },
          select: {
            id: true,
            grapeVarieties: true,
            sweetness: true,
            vintageYear: true,
            country: true,
            alcoholContent: true,
            isOakAged: true,
            color: true,
            composition: true,
            score: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { roundNumber: "asc" },
    });

    // Формируем ответ с историей раундов
    const history = rounds.map((round) => {
      const userGuess = round.guesses[0] || null; // У пользователя может быть только один ответ на раунд

      return {
        roundNumber: round.roundNumber,
        status: round.status,
        correctAnswer: {
          grapeVarieties: round.grapeVarieties,
          sweetness: round.sweetness,
          vintageYear: round.vintageYear,
          country: round.country,
          alcoholContent: round.alcoholContent,
          isOakAged: round.isOakAged,
          color: round.color,
          composition: round.composition,
        },
        photos: round.photos.map((p) => p.imageUrl),
        userGuess: userGuess
          ? {
              grapeVarieties: userGuess.grapeVarieties,
              sweetness: userGuess.sweetness,
              vintageYear: userGuess.vintageYear,
              country: userGuess.country,
              alcoholContent: userGuess.alcoholContent,
              isOakAged: userGuess.isOakAged,
              color: userGuess.color,
              composition: userGuess.composition,
              score: userGuess.score,
              submittedAt: userGuess.submittedAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      game: {
        id: game.id,
        code: game.code,
        status: game.status,
        totalRounds: game.totalRounds,
        createdAt: game.createdAt,
        finishedAt: game.finishedAt,
        host: game.host,
      },
      gamePlayer: {
        score: gamePlayer.score,
        position: gamePlayer.position,
      },
      rounds: history,
    });
  } catch (error) {
    console.error("Ошибка получения истории:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
