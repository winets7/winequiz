import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/games/[gameId]/scoreboard — Получение данных scoreboard для трансляции
 *
 * Возвращает:
 * - Информацию об игре
 * - Всех игроков с их результатами по каждому раунду
 * - Баллы за каждый раунд для каждого игрока
 * 
 * Доступ: только хост игры
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

    // Проверяем существование игры и получаем данные хоста
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

    // Проверяем, что пользователь является хостом
    if (game.hostId !== userId) {
      return NextResponse.json(
        { error: "Доступ запрещен. Только хост может просматривать scoreboard" },
        { status: 403 }
      );
    }

    // Получаем всех игроков игры, отсортированных по итоговому счёту
    const players = await prisma.gamePlayer.findMany({
      where: { gameId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { score: "desc" },
    });

    // Получаем все раунды игры (включая незавершенные)
    const rounds = await prisma.round.findMany({
      where: { gameId },
      include: {
        guesses: {
          include: {
            gamePlayer: {
              include: {
                user: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { roundNumber: "asc" },
    });

    // Формируем данные для scoreboard
    // Структура: для каждого игрока создаём массив баллов по раундам
    const scoreboardData = players.map((player, index) => {
      const roundScores: (number | null)[] = [];
      
      // Для каждого раунда находим баллы игрока
      rounds.forEach((round) => {
        const guess = round.guesses.find(
          (g) => g.gamePlayer.user.id === player.user.id
        );
        roundScores.push(guess ? guess.score : null);
      });

      return {
        position: index + 1,
        userId: player.user.id,
        name: player.user.name,
        avatar: player.user.avatar,
        totalScore: player.score,
        roundScores, // [score1, score2, score3, ...] или null если не ответил
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
      players: scoreboardData,
      rounds: rounds.map((r) => ({
        roundNumber: r.roundNumber,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("Ошибка получения scoreboard:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
