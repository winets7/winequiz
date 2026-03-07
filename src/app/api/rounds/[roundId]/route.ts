import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * DELETE /api/rounds/[roundId] — Удаление раунда (только хост, только WAITING, только CREATED)
 * Если удаляемый раунд — последний по номеру, totalRounds игры уменьшается на 1.
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

    await prisma.round.delete({
      where: { id: roundId },
    });

    const isLastSlot = round.roundNumber === round.game.totalRounds;
    if (isLastSlot && round.game.totalRounds > 1) {
      await prisma.gameSession.update({
        where: { id: round.game.id },
        data: { totalRounds: round.game.totalRounds - 1 },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления раунда:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
