import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fixRoundTextFields } from "@/lib/encoding";
import { filterPlayersExcludingHost } from "@/lib/game-host";

/**
 * GET /api/games/[gameId]/round/[roundNumber]/host-overview
 * Обзор раунда для организатора: статусы ответов игроков (CREATED/ACTIVE) или результаты (CLOSED).
 */
export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ gameId: string; roundNumber: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const { gameId, roundNumber: roundNumberParam } = await params;
    const roundNumber = parseInt(roundNumberParam, 10);
    if (Number.isNaN(roundNumber) || roundNumber < 1) {
      return NextResponse.json({ error: "Некорректный номер раунда" }, { status: 400 });
    }

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
        host: { select: { id: true, name: true, avatar: true } },
        players: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    }

    if (game.hostId !== userId) {
      return NextResponse.json(
        { error: "Доступно только организатору игры", isHost: false },
        { status: 403 }
      );
    }

    const round = await prisma.round.findUnique({
      where: {
        gameId_roundNumber: { gameId, roundNumber },
      },
      include: {
        photos: {
          orderBy: { sortOrder: "asc" },
          select: { imageUrl: true },
        },
        guesses: {
          include: {
            gamePlayer: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Раунд не найден" }, { status: 404 });
    }

    const players = filterPlayersExcludingHost(game.players, game.hostId);
    const guessByPlayerId = new Map(
      round.guesses.map((g) => [g.gamePlayerId, g])
    );

    const playerStatuses = players.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      avatar: p.user.avatar,
      hasSubmitted: guessByPlayerId.has(p.id),
    }));

    const correctAnswer = fixRoundTextFields({
      grapeVarieties: round.grapeVarieties,
      sweetness: round.sweetness,
      vintageYear: round.vintageYear,
      country: round.country,
      alcoholContent: round.alcoholContent,
      isOakAged: round.isOakAged,
      color: round.color,
      composition: round.composition,
    });

    const photos = round.photos.map((p) => p.imageUrl);

    let results:
      | Array<{
          userId: string;
          name: string;
          guess: {
            grapeVarieties: string[];
            sweetness: string | null;
            vintageYear: number | null;
            country: string | null;
            alcoholContent: number | null;
            isOakAged: boolean | null;
            color: string | null;
            composition: string | null;
          };
          score: number;
        }>
      | undefined;

    if (round.status === "CLOSED") {
      const guessByUserId = new Map(
        round.guesses.map((g) => [g.gamePlayer.user.id, g])
      );

      const emptyGuess = {
        grapeVarieties: [] as string[],
        sweetness: null as string | null,
        vintageYear: null as number | null,
        country: null as string | null,
        alcoholContent: null as number | null,
        isOakAged: null as boolean | null,
        color: null as string | null,
        composition: null as string | null,
      };

      const built = players.map((p) => {
        const g = guessByUserId.get(p.user.id);
        if (!g) {
          return {
            userId: p.user.id,
            name: p.user.name,
            guess: emptyGuess,
            score: 0,
          };
        }
        const raw = fixRoundTextFields({
          grapeVarieties: g.grapeVarieties,
          sweetness: g.sweetness,
          vintageYear: g.vintageYear,
          country: g.country,
          alcoholContent: g.alcoholContent,
          isOakAged: g.isOakAged,
          color: g.color,
          composition: g.composition,
        });
        return {
          userId: p.user.id,
          name: p.user.name,
          guess: {
            grapeVarieties: raw.grapeVarieties,
            sweetness: raw.sweetness,
            vintageYear: raw.vintageYear,
            country: raw.country,
            alcoholContent: raw.alcoholContent,
            isOakAged: raw.isOakAged,
            color: raw.color,
            composition: raw.composition,
          },
          score: g.score,
        };
      });
      built.sort((a, b) => b.score - a.score);
      results = built;
    }

    return NextResponse.json(
      {
        isHost: true,
        game: {
          id: game.id,
          code: game.code,
          status: game.status,
          totalRounds: game.totalRounds,
          createdAt: game.createdAt,
          finishedAt: game.finishedAt,
          host: game.host,
        },
        round: {
          roundNumber: round.roundNumber,
          status: round.status,
          correctAnswer,
          photos,
        },
        players: playerStatuses,
        results,
      },
      { headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Ошибка host-overview раунда:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
