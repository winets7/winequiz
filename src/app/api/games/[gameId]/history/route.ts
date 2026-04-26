import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fixRoundTextFields } from "@/lib/encoding";
import { auth } from "@/auth";

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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
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
        hostId: true,
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

    const closedRounds = await prisma.round.findMany({
      where: {
        gameId,
        status: "CLOSED",
      },
      include: {
        photos: {
          orderBy: { sortOrder: "asc" },
          select: { imageUrl: true },
        },
      },
      orderBy: { roundNumber: "asc" },
    });

    const normalizedRounds = closedRounds.map((round) => ({
      roundNumber: round.roundNumber,
      status: round.status,
      correctAnswer: fixRoundTextFields({
        grapeVarieties: round.grapeVarieties,
        sweetness: round.sweetness,
        vintageYear: round.vintageYear,
        country: round.country,
        alcoholContent: round.alcoholContent,
        isOakAged: round.isOakAged,
        color: round.color,
        composition: round.composition,
      }),
      photos: round.photos.map((p) => p.imageUrl),
    }));

    if (game.hostId === userId) {
      const players = await prisma.gamePlayer.findMany({
        where: { gameId, userId: { not: game.hostId } },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
          guesses: {
            select: {
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
              round: {
                select: {
                  roundNumber: true,
                },
              },
            },
          },
        },
        orderBy: { score: "desc" },
      });

      return NextResponse.json(
        {
          isHostView: true,
          game: {
            id: game.id,
            code: game.code,
            status: game.status,
            totalRounds: game.totalRounds,
            createdAt: game.createdAt,
            finishedAt: game.finishedAt,
            host: game.host,
          },
          players: players.map((player) => {
            const guessesByRound = new Map(
              player.guesses.map((guess) => [guess.round.roundNumber, guess])
            );

            return {
              user: player.user,
              gamePlayer: {
                score: player.score,
                position: player.position,
              },
              rounds: normalizedRounds.map((round) => {
                const userGuess = guessesByRound.get(round.roundNumber);
                return {
                  roundNumber: round.roundNumber,
                  status: round.status,
                  correctAnswer: round.correctAnswer,
                  photos: round.photos,
                  userGuess: userGuess
                    ? fixRoundTextFields({
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
                      })
                    : null,
                };
              }),
            };
          }),
        },
        {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
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

    const guesses = await prisma.guess.findMany({
      where: {
        gamePlayerId: gamePlayer.id,
        round: {
          gameId,
          status: "CLOSED",
        },
      },
      select: {
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
        round: {
          select: {
            roundNumber: true,
          },
        },
      },
    });

    const guessesByRound = new Map(
      guesses.map((guess) => [guess.round.roundNumber, guess])
    );

    // Формируем ответ с историей раундов (исправляем возможную кракозябру в текстовых полях)
    const history = normalizedRounds.map((round) => {
      const userGuess = guessesByRound.get(round.roundNumber) || null;

      return {
        roundNumber: round.roundNumber,
        status: round.status,
        correctAnswer: round.correctAnswer,
        photos: round.photos,
        userGuess: userGuess
          ? fixRoundTextFields({
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
            })
          : null,
      };
    });

    return NextResponse.json(
      {
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
      },
      {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Ошибка получения истории:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
