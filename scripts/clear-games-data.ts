/**
 * Очистка на сервере: удалить все игры и данные ответов (раунды, догадки, фото).
 * Пользователи (users) и их достижения (user_achievements) не трогаем.
 *
 * Запуск на сервере:
 *   cd /var/www/winequiz && npx tsx scripts/clear-games-data.ts
 *
 * Локально (с .env с DATABASE_URL):
 *   npx tsx scripts/clear-games-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Удаляем все игровые сессии — каскадно удалятся game_players, rounds, round_photos, player_guesses
  const deletedSessions = await prisma.gameSession.deleteMany({});
  console.log(`Удалено игровых сессий: ${deletedSessions.count}`);
  console.log("Игры и данные ответов очищены. Пользователи (регистрация) сохранены.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
