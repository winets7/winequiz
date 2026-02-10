import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🍷 Заполняем базу данных начальными данными...\n");

  // =============================================
  // 1. Создаём администратора
  // =============================================
  const adminPassword = await hash("Sva8601729*-+", 12);
  const admin = await prisma.user.upsert({
    where: { phone: "80000000000" },
    update: {
      name: "winevictory",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
    create: {
      name: "winevictory",
      phone: "80000000000",
      passwordHash: adminPassword,
      role: "ADMIN",
      level: 1,
      xp: 0,
    },
  });
  console.log(`✅ Администратор создан: ${admin.phone}`);

  // =============================================
  // 2. Создаём достижения
  // =============================================
  const achievements = [
    {
      name: "Первый глоток",
      description: "Сыграть первую игру",
      icon: "🥂",
      condition: JSON.stringify({ type: "games_played", value: 1 }),
      xpReward: 50,
    },
    {
      name: "Завсегдатай",
      description: "Сыграть 10 игр",
      icon: "🎮",
      condition: JSON.stringify({ type: "games_played", value: 10 }),
      xpReward: 100,
    },
    {
      name: "Нос сомелье",
      description: "Угадать все параметры вина в одном раунде",
      icon: "👃",
      condition: JSON.stringify({ type: "perfect_round", value: 1 }),
      xpReward: 200,
    },
    {
      name: "Знаток сортов",
      description: "Правильно угадать 20 сортов винограда",
      icon: "🍇",
      condition: JSON.stringify({ type: "correct_grapes", value: 20 }),
      xpReward: 150,
    },
    {
      name: "Непобедимый",
      description: "5 побед подряд",
      icon: "🏆",
      condition: JSON.stringify({ type: "win_streak", value: 5 }),
      xpReward: 300,
    },
    {
      name: "Географ",
      description: "Правильно угадать страну 15 раз",
      icon: "🌍",
      condition: JSON.stringify({ type: "correct_country", value: 15 }),
      xpReward: 150,
    },
    {
      name: "Сомелье",
      description: "Набрать 500 очков суммарно",
      icon: "🍷",
      condition: JSON.stringify({ type: "total_points", value: 500 }),
      xpReward: 500,
    },
    {
      name: "Легенда",
      description: "Достичь 50-го уровня",
      icon: "👑",
      condition: JSON.stringify({ type: "level", value: 50 }),
      xpReward: 1000,
    },
    {
      name: "Первая победа",
      description: "Занять 1-е место в игре",
      icon: "🥇",
      condition: JSON.stringify({ type: "first_win", value: 1 }),
      xpReward: 100,
    },
    {
      name: "Бочковой мастер",
      description: "Правильно определить выдержку в бочке 10 раз",
      icon: "🪵",
      condition: JSON.stringify({ type: "correct_oak", value: 10 }),
      xpReward: 100,
    },
  ];

  let achievementCount = 0;
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { name: ach.name },
      update: {},
      create: ach,
    });
    achievementCount++;
  }
  console.log(`✅ Создано ${achievementCount} достижений`);

  console.log("\n🎉 База данных успешно заполнена!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Ошибка при заполнении БД:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
