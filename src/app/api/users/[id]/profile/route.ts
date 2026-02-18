import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/users/[id]/profile — Получение данных профиля пользователя
 *
 * Возвращает:
 * - Основные данные пользователя
 * - Созданные им игры (hostedGames)
 * - Игры, в которых участвовал (participatedGames)
 * - Статистику (totalGames, totalPoints, avgScore)
 * - Достижения
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id;
    const currentUserRole = session?.user?.role;

    // Основные данные пользователя (включая настройку приватности)
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
        isProfilePublic: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Проверка доступа к профилю:
    // 1. Владелец профиля всегда видит свой профиль
    // 2. Администратор всегда видит все профили
    // 3. Остальные видят только если isProfilePublic = true
    const isOwner = currentUserId === id;
    const isAdmin = currentUserRole === "ADMIN";
    const isPublic = user.isProfilePublic;

    if (!isOwner && !isAdmin && !isPublic) {
      return NextResponse.json(
        { error: "Профиль недоступен" },
        { status: 403 }
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

    // Статистика догадок
    const guessesAgg = await prisma.playerGuess.aggregate({
      where: { gamePlayer: { userId: id } },
      _count: { id: true },
      _sum: { score: true },
    });

    // Завершённые игры (только FINISHED)
    const totalGamesFinished = await prisma.gamePlayer.count({
      where: { userId: id, game: { status: "FINISHED" } },
    });

    // Запланированные игры (WAITING)
    const plannedGames = await prisma.gamePlayer.count({
      where: { userId: id, game: { status: "WAITING" } },
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

    // Скрываем isProfilePublic для других пользователей (кроме владельца и админа)
    const userResponse = isOwner || isAdmin
      ? user
      : { ...user, isProfilePublic: undefined };

    return NextResponse.json({
      user: userResponse,
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
        totalGames: totalGamesFinished,
        plannedGames,
        totalWins,
        totalGuesses: guessesAgg._count.id,
        totalPoints: guessesAgg._sum.score ?? 0,
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
