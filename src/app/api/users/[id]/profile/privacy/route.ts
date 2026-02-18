import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * PATCH /api/users/[id]/profile/privacy — Обновление настройки приватности профиля
 *
 * Тело запроса: { isProfilePublic: boolean }
 * 
 * Только владелец профиля может изменять эту настройку
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    // Только владелец профиля может изменять настройку
    if (currentUserId !== id) {
      return NextResponse.json(
        { error: "Нет доступа" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isProfilePublic } = body;

    if (typeof isProfilePublic !== "boolean") {
      return NextResponse.json(
        { error: "isProfilePublic должен быть boolean" },
        { status: 400 }
      );
    }

    // Обновляем настройку
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isProfilePublic },
      select: {
        id: true,
        isProfilePublic: true,
      },
    });

    return NextResponse.json({
      success: true,
      isProfilePublic: updatedUser.isProfilePublic,
    });
  } catch (error) {
    console.error("Ошибка обновления приватности профиля:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
