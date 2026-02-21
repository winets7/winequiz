import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone, isValidPhone } from "@/lib/phone";

/**
 * POST /api/auth/register — Регистрация нового пользователя
 *
 * Body: { name: string, phone: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, password } = body;

    // --- Валидация ---

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

    if (!phone) {
      return NextResponse.json(
        { error: "Номер телефона обязателен" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "Неверный формат номера телефона" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    // --- Проверяем, не занят ли номер ---

    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Этот номер телефона уже зарегистрирован" },
        { status: 409 }
      );
    }

    // --- Создаём пользователя ---

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        passwordHash,
        role: "PLAYER",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        level: true,
        xp: true,
      },
    });

    return NextResponse.json({
      message: "Регистрация успешна",
      user,
    });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
