import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/rounds?gameId=xxx — Получить раунды игры.
 *
 * Доступ:
 *  - Хост игры — все раунды со всеми полями (включая правильные ответы и фото).
 *  - Участник игры — раунды без правильных ответов, пока они не CLOSED.
 *    Полные поля и фото возвращаются только для CLOSED. Для своих ответов
 *    возвращаются `guesses` (только своя запись).
 *  - Сторонние пользователи — 403.
 *
 * Параметр `userId` из query игнорируется (всегда берём `session.user.id`),
 * чтобы исключить подделку чужого id и утечку правильных ответов раунда.
 */
export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get("gameId");
    if (!gameId) {
      return NextResponse.json({ error: "gameId обязателен" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      select: { id: true, hostId: true },
    });
    if (!game) {
      return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    }

    const isHost = userId === game.hostId;

    let gamePlayerId: string | null = null;
    if (!isHost) {
      const gp = await prisma.gamePlayer.findUnique({
        where: { gameId_userId: { gameId, userId } },
        select: { id: true },
      });
      gamePlayerId = gp?.id ?? null;
      if (!gamePlayerId) {
        return NextResponse.json(
          { error: "Доступ запрещён" },
          { status: 403 }
        );
      }
    }

    const rounds = await prisma.round.findMany({
      where: { gameId },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        ...(gamePlayerId
          ? {
              guesses: {
                where: { gamePlayerId },
                select: {
                  grapeVarieties: true,
                  sweetness: true,
                  vintageYear: true,
                  country: true,
                  alcoholContent: true,
                  isOakAged: true,
                  color: true,
                  composition: true,
                  submittedAt: true,
                },
              },
            }
          : {}),
      },
      orderBy: { roundNumber: "asc" },
    });

    if (isHost) {
      return NextResponse.json({ rounds });
    }

    // Скрываем правильные ответы и фотографии до закрытия раунда —
    // иначе любой участник через REST увидит загаданное вино.
    const filtered = rounds.map((round) => {
      const ownGuesses =
        (round as typeof round & { guesses?: unknown[] }).guesses ?? [];

      if (round.status === "CLOSED") {
        return {
          id: round.id,
          gameId: round.gameId,
          roundNumber: round.roundNumber,
          status: round.status,
          grapeVarieties: round.grapeVarieties,
          sweetness: round.sweetness,
          vintageYear: round.vintageYear,
          country: round.country,
          alcoholContent: round.alcoholContent,
          isOakAged: round.isOakAged,
          color: round.color,
          composition: round.composition,
          createdAt: round.createdAt,
          closedAt: round.closedAt,
          photos: round.photos,
          guesses: ownGuesses,
        };
      }

      // CREATED / ACTIVE: только статус и (опционально) собственные ответы.
      return {
        id: round.id,
        gameId: round.gameId,
        roundNumber: round.roundNumber,
        status: round.status,
        guesses: ownGuesses,
      };
    });

    return NextResponse.json({ rounds: filtered });
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
