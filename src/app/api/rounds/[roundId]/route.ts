import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * DELETE /api/rounds/[roundId] — Удаление раунда (только хост, только WAITING, только CREATED)
 * Удаляет раунд, уменьшает totalRounds на 1 и сдвигает номера всех последующих раундов.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        game: {
          select: { id: true, hostId: true, status: true, totalRounds: true },
        },
      },
    });

    if (!round) {
      return NextResponse.json(
        { error: "Раунд не найден" },
        { status: 404 }
      );
    }

    if (round.game.hostId !== userId) {
      return NextResponse.json(
        { error: "Только хост может удалять раунды" },
        { status: 403 }
      );
    }

    if (round.game.status !== "WAITING") {
      return NextResponse.json(
        { error: "Удалять раунды можно только пока игра ожидает старта" },
        { status: 400 }
      );
    }

    if (round.status !== "CREATED") {
      return NextResponse.json(
        { error: "Можно удалить только раунд, который ещё не был начат" },
        { status: 400 }
      );
    }

    const gameId = round.game.id;
    const deletedNumber = round.roundNumber;
    const newTotalRounds = Math.max(1, round.game.totalRounds - 1);

    await prisma.$transaction(async (tx) => {
      await tx.round.delete({ where: { id: roundId } });

      const following = await tx.round.findMany({
        where: { gameId, roundNumber: { gt: deletedNumber } },
        orderBy: { roundNumber: "asc" },
      });
      for (const r of following) {
        await tx.round.update({
          where: { id: r.id },
          data: { roundNumber: r.roundNumber - 1 },
        });
      }

      await tx.gameSession.update({
        where: { id: gameId },
        data: { totalRounds: newTotalRounds },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления раунда:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
