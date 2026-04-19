import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { filterPlayersExcludingHost } from "@/lib/game-host";

/**
 * GET /api/games/active — незавершённые игры текущего пользователя
 *
 * asOrganizer: пользователь — хост (любой статус кроме FINISHED)
 * asParticipant: пользователь в составе игроков, но не хост
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const notFinished = { not: "FINISHED" as const };

    const hosted = await prisma.gameSession.findMany({
      where: {
        hostId: userId,
        status: notFinished,
      },
      select: {
        id: true,
        hostId: true,
        code: true,
        status: true,
        totalRounds: true,
        currentRound: true,
        createdAt: true,
        players: { select: { id: true, userId: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const participantRows = await prisma.gamePlayer.findMany({
      where: {
        userId,
        game: {
          hostId: { not: userId },
          status: notFinished,
        },
      },
      select: {
        game: {
          select: {
            id: true,
            hostId: true,
            code: true,
            status: true,
            totalRounds: true,
            currentRound: true,
            createdAt: true,
            players: { select: { id: true, userId: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const seen = new Set<string>();
    const asParticipant = [];
    for (const row of participantRows) {
      const g = row.game;
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      asParticipant.push(g);
    }

    const mapGame = (g: (typeof hosted)[0]) => ({
      id: g.id,
      code: g.code,
      status: g.status,
      totalRounds: g.totalRounds,
      currentRound: g.currentRound,
      createdAt: g.createdAt.toISOString(),
      playersCount: filterPlayersExcludingHost(g.players, g.hostId).length,
    });

    return NextResponse.json({
      asOrganizer: hosted.map(mapGame),
      asParticipant: asParticipant.map(mapGame),
    });
  } catch (e) {
    console.error("GET /api/games/active:", e);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
