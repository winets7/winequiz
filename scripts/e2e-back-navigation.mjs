/**
 * E2E-проверка навигации: страница игры → Раунд 1 → страница редактирования раунда → Назад → фиксация открытой страницы.
 *
 * Запуск:
 *   1. Запустите приложение: npm run dev (и при необходимости npm run socket).
 *   2. Убедитесь, что вы авторизованы как хост игры (или передайте PLAYWRIGHT_AUTH_FILE с сохранённой сессией).
 *   3. node scripts/e2e-back-navigation.mjs
 *
 * Переменные окружения:
 *   BASE_URL  — базовый URL приложения (по умолчанию http://localhost:3000)
 *   GAME_ID   — ID игры (по умолчанию 878847)
 *   PLAYWRIGHT_AUTH_FILE — путь к JSON с storageState для авторизованной сессии (опционально)
 */

import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const GAME_ID = process.env.GAME_ID || "878847";
const AUTH_FILE = process.env.PLAYWRIGHT_AUTH_FILE;

const LOG_PREFIX = "[e2e-back-nav]";

function log(msg, ok = null) {
  const icon = ok === true ? "✅" : ok === false ? "❌" : "  ";
  console.log(`${icon} ${LOG_PREFIX} ${msg}`);
}

async function main() {
  console.log("\n🍷 E2E: проверка перехода Назад со страницы редактирования раунда\n");
  console.log(`   BASE_URL: ${BASE_URL}`);
  console.log(`   GAME_ID:  ${GAME_ID}`);
  if (AUTH_FILE) console.log(`   AUTH:     ${AUTH_FILE}`);
  console.log("");

  const browser = await chromium.launch({ headless: true });
  const contextOptions = {};
  if (AUTH_FILE) {
    try {
      const fs = await import("fs");
      const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
      if (state.cookies && state.cookies.length) {
        contextOptions.storageState = AUTH_FILE;
        log("Используется сохранённая сессия из PLAYWRIGHT_AUTH_FILE", true);
      }
    } catch (e) {
      log(`Не удалось загрузить AUTH_FILE: ${e.message}`, false);
    }
  }

  const context = await browser.newContext({
    ...contextOptions,
    baseURL: BASE_URL,
  });
  const page = await context.newPage();

  const results = {
    lobbyUrl: null,
    lobbyLoaded: false,
    round1Clicked: false,
    editPageUrl: null,
    afterBackUrl: null,
    afterBackUrlStable: null,
    error: null,
  };

  try {
    // 1. Открыть страницу игры (лобби)
    const lobbyPath = `/lobby/${GAME_ID}`;
    results.lobbyUrl = new URL(lobbyPath, BASE_URL).href;
    log(`Открываю страницу игры: ${results.lobbyUrl}`);
    await page.goto(lobbyPath, { waitUntil: "domcontentloaded", timeout: 15000 });

    const currentUrlAfterLobby = page.url();
    if (currentUrlAfterLobby.includes("/login")) {
      results.error = "После перехода на лобби произошёл редирект на /login. Требуется авторизация.";
      log(results.error, false);
      log("Подсказка: залогиньтесь в браузере, затем сохраните storageState и задайте PLAYWRIGHT_AUTH_FILE.", false);
      await browser.close();
      printReport(results);
      process.exit(1);
    }
    results.lobbyLoaded = true;
    log("Страница лобби загружена", true);

    // 2. Нажать «Раунд 1»
    log("Ищу и нажимаю «Раунд 1»...");
    await page.getByRole("button", { name: "Раунд 1" }).first().click({ timeout: 5000 });
    results.round1Clicked = true;
    log("Кнопка «Раунд 1» нажата", true);

    // 3. Дождаться страницы редактирования раунда
    const editPath = `/lobby/${GAME_ID}/round/1/edit`;
    await page.waitForURL((url) => url.pathname === editPath || url.pathname.endsWith("/round/1/edit"), { timeout: 10000 });
    results.editPageUrl = page.url();
    log(`Страница редактирования раунда открыта: ${results.editPageUrl}`, true);

    // 4. Нажать кнопку «Назад» в браузере
    log("Нажимаю кнопку «Назад» в браузере...");
    await page.goBack({ waitUntil: "domcontentloaded" });
    const urlImmediatelyAfterBack = page.url();
    results.afterBackUrl = urlImmediatelyAfterBack;
    log(`Сразу после «Назад» открыта страница: ${urlImmediatelyAfterBack}`);

    // 5. Подождать стабилизации (лобби может сделать replace на edit и показать диалог «Сохранить?»)
    await page.waitForTimeout(1500);
    const urlAfterStable = page.url();
    results.afterBackUrlStable = urlAfterStable;
    log(`Через 1.5 с открыта страница: ${urlAfterStable}`);

    log("Проверка завершена.", true);
  } catch (e) {
    results.error = e.message || String(e);
    log(`Ошибка: ${results.error}`, false);
  } finally {
    await browser.close();
  }

  printReport(results);
  process.exit(results.error ? 1 : 0);
}

function printReport(r) {
  console.log("\n--- Отчёт ---");
  console.log("URL страницы игры (лобби):     ", r.lobbyUrl ?? "—");
  console.log("Лобби загружено:               ", r.lobbyLoaded ? "да" : "нет");
  console.log("Кнопка «Раунд 1» нажата:       ", r.round1Clicked ? "да" : "нет");
  console.log("URL страницы редактирования:    ", r.editPageUrl ?? "—");
  console.log("URL сразу после «Назад»:        ", r.afterBackUrl ?? "—");
  console.log("URL через 1.5 с после «Назад»:  ", r.afterBackUrlStable ?? "—");
  if (r.error) console.log("Ошибка:                        ", r.error);
  console.log("--------------------------------\n");
}

main().catch((e) => {
  console.error(LOG_PREFIX, e);
  process.exit(1);
});
