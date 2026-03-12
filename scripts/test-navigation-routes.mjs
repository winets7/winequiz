/**
 * Проверка маршрутов и редиректов в соответствии с логикой проекта.
 * Запуск: сначала `npm run dev`, затем `node scripts/test-navigation-routes.mjs`
 * Или: BASE_URL=https://your-server node scripts/test-navigation-routes.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

function log(msg, ok = null) {
  const icon = ok === true ? "✅" : ok === false ? "❌" : "  ";
  console.log(`${icon} ${msg}`);
}

async function fetchNoRedirect(url) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  return { status: res.status, location: res.headers.get("location"), url };
}

async function main() {
  console.log("\n🍷 Проверка маршрутов и навигации (логика проекта)\n");
  console.log(`   BASE_URL: ${BASE}\n`);

  let failed = 0;

  // Публичные страницы — должны отдавать 200
  const publicRoutes = [
    ["/", "Главная"],
    ["/login", "Вход"],
    ["/register", "Регистрация"],
  ];
  for (const [path, name] of publicRoutes) {
    try {
      const { status } = await fetchNoRedirect(`${BASE}${path}`);
      if (status === 200) {
        log(`${name} ${path} → 200`, true);
      } else {
        log(`${name} ${path} → ${status} (ожидалось 200)`, false);
        failed++;
      }
    } catch (e) {
      log(`${name} ${path} → ошибка: ${e.message}`, false);
      failed++;
    }
  }

  // Защищённые маршруты (middleware) — без авторизации редирект на /login с callbackUrl
  // Next.js/auth часто отдаёт 307 Temporary Redirect вместо 302
  const redirectStatus = (s) => s === 302 || s === 307;
  const protectedRoutes = [
    ["/play/test-game-id", "/play/test-game-id"],
    ["/lobby/test-game-id", "/lobby/test-game-id"],
    ["/profile", "/profile"],
    ["/join/ABC123", "/join/ABC123"],
  ];
  for (const [path, expectedInCallback] of protectedRoutes) {
    try {
      const { status, location } = await fetchNoRedirect(`${BASE}${path}`);
      if (!redirectStatus(status)) {
        log(`Защищённый ${path} → ${status} (ожидалось 302/307)`, false);
        failed++;
        continue;
      }
      const toLogin = location && location.startsWith("/login");
      const hasCallback = location && location.includes("callbackUrl=");
      if (toLogin && hasCallback) {
        log(`Защищённый ${path} → ${status} на /login?callbackUrl=...`, true);
      } else {
        log(`Защищённый ${path} → ${status}, но Location: ${location}`, false);
        failed++;
      }
    } catch (e) {
      log(`Защищённый ${path} → ошибка: ${e.message}`, false);
      failed++;
    }
  }

  // Страницы авторизации при уже залогиненном пользователе редиректят на главную
  // (без cookie мы не залогинены — проверяем только что отдают 200)
  log("Страницы login/register без сессии отдают 200 (проверено выше)", true);

  // Проверка иерархии: дочерние маршруты тоже защищены
  const childRoutes = [
    "/play/test-game-id/select/color",
    "/play/test-game-id/select/sweetness",
    "/lobby/test-game-id/round/1/edit",
  ];
  for (const path of childRoutes) {
    try {
      const { status, location } = await fetchNoRedirect(`${BASE}${path}`);
      if (redirectStatus(status) && location && location.includes("/login")) {
        log(`Дочерний маршрут ${path} → ${status} на /login`, true);
      } else {
        log(`Дочерний маршрут ${path} → ${status} ${location || ""}`, false);
        failed++;
      }
    } catch (e) {
      log(`Дочерний маршрут ${path} → ошибка: ${e.message}`, false);
      failed++;
    }
  }

  console.log("");
  if (failed > 0) {
    console.log(`Итого: ${failed} проверок не прошло.\n`);
    process.exit(1);
  }
  console.log("Все проверки маршрутов и редиректов пройдены.\n");
  console.log("Примечание: переходы «Назад» и useHierarchicalBack проверяются в браузере (E2E).");
  console.log("Иерархия: play/[id] → profile/[id]; play/[id]/select/* → play/[id]; lobby/.../edit → lobby/[id]; lobby/.../select/* → edit.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
