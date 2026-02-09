import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/users/guest — Создание гостевого пользователя
 *
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Имя обязательно" },
        { status: 400 }
      );
    }

    if (name.trim().length > 20) {
      return NextResponse.json(
        { error: "Имя слишком длинное (макс. 20 символов)" },
        { status: 400 }
      );
    }

    // Создаём гостевого пользователя с уникальным email
    const guestEmail = `guest_${uuidv4()}@winequiz.local`;

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: guestEmail,
        passwordHash: "", // Гостевой — без пароля
        role: "PLAYER",
      },
      select: {
        id: true,
        name: true,
        level: true,
        xp: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Ошибка создания гостевого пользователя:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
