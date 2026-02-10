import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/[id]/profile — Получение данных профиля пользователя
 *
 * Возвращает:
 * - Основные данные пользователя
 * - Созданные им игры (hostedGames)
 * - Игры, в которых участвовал (participatedGames)
 * - Статистику (totalGames, correctAnswers, totalPoints, avgTime)
 * - Достижения
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Основные данные пользователя
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        level: true,
        xp: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Созданные игры (где пользователь — хост)
    const hostedGames = await prisma.gameSession.findMany({
      where: { hostId: id },
      select: {
        id: true,
        code: true,
        status: true,
        totalRounds: true,
        currentRound: true,
        createdAt: true,
        finishedAt: true,
        players: {
          select: {
            id: true,
            score: true,
            position: true,
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { score: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Игры, в которых участвовал (но НЕ был хостом)
    const participatedEntries = await prisma.gamePlayer.findMany({
      where: {
        userId: id,
        game: { hostId: { not: id } },
      },
      select: {
        score: true,
        position: true,
        joinedAt: true,
        game: {
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
            players: {
              select: {
                id: true,
                score: true,
                position: true,
                user: {
                  select: { id: true, name: true, avatar: true },
                },
              },
              orderBy: { score: "desc" },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 20,
    });

    // Статистика ответов
    const answersAgg = await prisma.playerAnswer.aggregate({
      where: { gamePlayer: { userId: id } },
      _count: { id: true },
      _sum: { points: true },
      _avg: { timeTaken: true },
    });

    const correctAnswers = await prisma.playerAnswer.count({
      where: { gamePlayer: { userId: id }, isCorrect: true },
    });

    // Общее количество сыгранных игр
    const totalGamesPlayed = await prisma.gamePlayer.count({
      where: { userId: id },
    });

    // Количество побед (позиция = 1)
    const totalWins = await prisma.gamePlayer.count({
      where: { userId: id, position: 1 },
    });

    // Достижения
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: id },
      select: {
        unlockedAt: true,
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            xpReward: true,
          },
        },
      },
      orderBy: { unlockedAt: "desc" },
    });

    // Лучший результат
    const bestScore = await prisma.gamePlayer.aggregate({
      where: { userId: id },
      _max: { score: true },
    });

    return NextResponse.json({
      user,
      hostedGames: hostedGames.map((g) => ({
        ...g,
        playersCount: g.players.length,
      })),
      participatedGames: participatedEntries.map((entry) => ({
        id: entry.game.id,
        code: entry.game.code,
        status: entry.game.status,
        totalRounds: entry.game.totalRounds,
        createdAt: entry.game.createdAt,
        finishedAt: entry.game.finishedAt,
        host: entry.game.host,
        playersCount: entry.game.players.length,
        players: entry.game.players,
        myScore: entry.score,
        myPosition: entry.position,
      })),
      stats: {
        totalGames: totalGamesPlayed,
        totalWins,
        totalAnswers: answersAgg._count.id,
        correctAnswers,
        accuracy: answersAgg._count.id > 0
          ? Math.round((correctAnswers / answersAgg._count.id) * 100)
          : 0,
        totalPoints: answersAgg._sum.points ?? 0,
        avgTime: answersAgg._avg.timeTaken
          ? Math.round(answersAgg._avg.timeTaken)
          : 0,
        bestScore: bestScore._max.score ?? 0,
      },
      achievements: achievements.map((a) => ({
        ...a.achievement,
        unlockedAt: a.unlockedAt,
      })),
    });
  } catch (error) {
    console.error("Ошибка получения профиля:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
