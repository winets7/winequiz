# Навигация: открытие страниц и возвраты

Документ фиксирует **все точки входа** (как пользователь попадает на страницу) и **возвраты** (кнопка «Назад» / свайп / программный переход назад). Используется Next.js App Router, `useRouter`, `router.push`/`router.replace`, хук `useHierarchicalBack` и ручная работа с `history` для иерархического «Назад».

---

## 1. Точки входа (откуда открываются страницы)

### Главная `/`
- **Прямой заход** по URL или по корню сайта.
- **После логина/регистрации**: `register` → `router.push("/")` или `router.push("/login")`; `login` → `router.push("/")`.
- **Залогиненный пользователь**: хаб игр — ссылки на `/games/wine-quiz`, `/games/barramundi`, `/games/wine-nose`; в шапке — `Link href="/profile"`.

### Логин `/login`
- **С главной**: `Link href="/login"` (незалогиненный пользователь).
- **После регистрации**: `router.push("/login")`.

### Регистрация `/register`
- **С главной**: `Link href="/register"`.

### Винная викторина `/games/wine-quiz`
- **С главной**: `Link href="/games/wine-quiz"` (залогиненный пользователь).
- **Создать игру**: POST `/api/games` → `router.push(\`/lobby/${game.id}\`)`.
- **Присоединиться по коду**: ввод кода → `router.push(\`/join/${fullCode}\`)` (например `WN-482917`).

### Присоединение по коду `/join/[code]`
- **Со страницы викторины** `/games/wine-quiz`: после ввода кода и подтверждения.

### Другие направления `/games/barramundi`, `/games/wine-nose`
- **С главной** `/`: `Link` на соответствующий маршрут (страницы-заглушки, возврат ссылкой «К выбору игр» на `/`).

### Профиль `/profile`, `/profile/[id]`
- **Свой профиль**: `Link href="/profile"` с главной `/` или со страницы `/games/wine-quiz` (аватар в шапке; на `/` также ссылка «Профиль» внизу).
- **Чужой профиль**: `profile-games.tsx` → `router.push(\`/profile/${player.user.id}\`)` (из списка игр в профиле); `player-rounds-list.tsx` — переход в профиль по клику на игрока (если есть).

### Игра (игрок) `/play/[gameId]`
- **После присоединения**: `join/[code]` → кнопка «Играть» → `router.push(\`/play/${gameId}\`)`.
- **Из профиля**: `profile-games.tsx` → `router.push(gameLink)` (ссылка на игру) или `router.push(\`/history/${game.id}\`)`; из истории можно перейти в игру.
- **Со scoreboard**: `scoreboard/[gameId]` → кнопка → `router.push(\`/play/${gameId}\`)`.
- **Из лобби (игрок не хост)**: через общий поток (например после join).

### Выбор характеристики (игрок) `/play/[gameId]/select/[characteristic]`
- **Со страницы игры** `/play/[gameId]`: клик по карточке характеристики в `CharacteristicCards` → `router.push(\`/play/${gameId}/select/${path}\`)`. Порядок характеристик: color → sweetness → composition → grape-varieties → country → vintage-year → alcohol-content → oak-aged.

### Лобби (хост) `/lobby/[gameId]`
- **Со страницы викторины** `/games/wine-quiz`: после «Создать игру» (POST `/api/games`) → `router.push(\`/lobby/${game.id}\`)`.

### Редактирование раунда (хост) `/lobby/[gameId]/round/[roundNumber]/edit`
- **Из лобби**: клик по раунду или кнопка «Редактировать» → `router.push(\`/lobby/${gameId}/round/${roundNum}/edit\`)`.

### Выбор характеристики раунда (хост) `/lobby/[gameId]/round/[roundNumber]/select/[characteristic]`
- **Со страницы редактирования раунда** `edit`: клик по карточке в `HostRoundCharacteristicCards` → `router.push(\`${basePath}/${card.path}\`)` (basePath = edit-страница без `/edit`, т.е. round path).

### История игры `/history/[gameId]`
- **Из профиля**: `profile-games.tsx` → `router.push(\`/history/${game.id}\`)` или с параметром раунда.
- **Со страницы игры**: `player-rounds-list.tsx` → `router.push(\`/history/${gameId}\`)` или `router.push(\`/history/${gameId}?round=${roundNumber}\`)`.

### Таблица результатов `/scoreboard/[gameId]`
- **Прямой переход** по ссылке или из лобби/игры (если есть кнопка «Таблица»). В коде: `router.push(\`/play/${gameId}\`)` со scoreboard на игру.

### Офлайн `/offline`
- **PWA**: при отсутствии сети показывается офлайн-страница.

---

## 2. Возвраты (куда ведёт «Назад» и кнопки возврата)

Иерархия задаётся в `.cursor/rules/hierarchical-navigation.mdc` и в коде через `useHierarchicalBack(parentPath)` и ручную работу с `history` на edit.

| Страница | Родитель (возврат ведёт на) | Как реализовано |
|----------|-----------------------------|------------------|
| `/play/[gameId]` | `/games/wine-quiz` | `useHierarchicalBack("/games/wine-quiz")` |
| `/play/[gameId]/select/*` | `/play/[gameId]` | `useHierarchicalBack(\`/play/${gameId}\`)` |
| `/lobby/[gameId]` | `/games/wine-quiz` | `useHierarchicalBack("/games/wine-quiz", { enabled: !!game })` |
| `/lobby/[gameId]/round/[n]/edit` | `/lobby/[gameId]` | Ручная запись в history (parentPath = lobby) + свой `popstate`: при «Назад» остаёмся на edit и показываем диалог «Сохранить?»; при подтверждении выхода — переход в лобби |
| `/lobby/[gameId]/round/[n]/select/[characteristic]` | `/lobby/[gameId]/round/[n]/edit` | `useHierarchicalBack(editUrl)`; после выбора значения — `router.replace(editUrl)` + sessionStorage `hierarchical-back-from-select` для схлопывания истории |

**Особенности:**
- **Лобби → edit**: при браузерном «Назад» с edit лобби перехватывает (useLayoutEffect + sessionStorage), делает `router.replace(editUrl)` и выставляет флаг показа диалога «Сохранить?».
- **Edit**: при «Назад» не уходим сразу в лобби, а показываем диалог; при выходе — переход в лобби (`router.replace(target)`).
- **Select (хост)**: после сохранения значения — `router.replace(editUrl)`, без лишней записи в history; флаг `hierarchical-back-from-select` обрабатывается в edit для `history.go(-1)` при необходимости.

### Кнопка «Назад» со страницы редактирования раунда (edit)

Роутер Next.js переключает маршрут на лобби **до** срабатывания события `popstate`, поэтому обработчик `popstate` на странице edit часто не вызывается (страница размонтируется, в логах видно `popstate listener removed` → `navigate` edit→lobby).

**Реализованный сценарий:**

1. **Лобби как fallback:** при монтировании лобби `useLayoutEffect` проверяет `sessionStorage` ключ `lobby-edit-page-url`. Если там URL страницы edit для этого лобби, лобби выставляет флаг `lobby-edit-show-save-dialog`, делает `router.replace(editUrl)` и пользователь снова попадает на edit.
2. **Флаг диалога при размонтировании edit:** в cleanup эффекта с `popstate` на странице edit проверяется, совпадает ли текущий `window.location.pathname` с путём лобби (`parentPath`). Если да (значит уход по «Назад»), в `sessionStorage` пишется `lobby-edit-show-save-dialog = "1"`. Так флаг гарантированно установлен до монтирования лобби.
3. При открытии edit (в т.ч. после редиректа с лобби) эффект читает этот флаг и при значении `"1"` показывает диалог «Сохранить внесённые изменения?».

Ключи sessionStorage: `lobby-edit-page-url` (URL страницы edit, пишется на edit), `lobby-edit-show-save-dialog` (показать диалог при следующем открытии edit).

---

## 3. Действия по страницам (краткая таблица)

| Действие | Откуда | Куда |
|----------|--------|------|
| Войти | `/` | `/login` (Link) |
| Зарегистрироваться | `/` | `/register` (Link) |
| После входа | `/login` | `/` |
| После регистрации | `/register` | `/` или `/login` |
| Винная викторина (хаб игры) | `/` | `/games/wine-quiz` (Link) |
| Создать игру | `/games/wine-quiz` | `/lobby/[gameId]` (router.push после POST) |
| Присоединиться по коду | `/games/wine-quiz` | `/join/[code]` (router.push) |
| В игру после join | `/join/[code]` | `/play/[gameId]` (router.push) |
| Профиль | `/`, `/games/wine-quiz` | `/profile` (Link) |
| Профиль игрока | профиль (список игр) | `/profile/[id]` (router.push) |
| История игры | профиль / игра | `/history/[gameId]` (router.push) |
| В игру из истории/профиля | профиль | `/play/[gameId]` или `/history/[gameId]` |
| Выбор характеристики (игрок) | `/play/[gameId]` | `/play/[gameId]/select/[characteristic]` (router.push из CharacteristicCards) |
| Редактировать раунд | `/lobby/[gameId]` | `/lobby/[gameId]/round/[n]/edit` (router.push) |
| Выбор характеристики (хост) | edit раунда | `/lobby/.../round/[n]/select/[characteristic]` (router.push из HostRoundCharacteristicCards) |
| Назад (игрок, экран игры) | `/play/[gameId]` | `/games/wine-quiz` (goBack) |
| Назад (игрок, выбор характеристики) | `/play/.../select/*` | `/play/[gameId]` (goBack) |
| Назад (хост, лобби) | `/lobby/[gameId]` | `/games/wine-quiz` (goBack) |
| Назад (хост, edit раунда) | edit | диалог «Сохранить?», затем при выходе → лобби |
| Назад (хост, select характеристики) | select | `/lobby/.../round/[n]/edit` (goBack или replace) |

---

## 4. Логирование навигации

В `src/lib/navigation-log.ts` пишутся события:
- `history_write` — запись родителя и текущего URL в историю (для иерархического «Назад»).
- `back_popstate` — срабатывание браузерного «Назад»/свайпа.
- `back_button` — вызов возврата по кнопке (goBack).
- `back_error` — ошибка при возврате.

В консоли браузера фильтр по `[navigation]` показывает все эти события.

---

## 5. Связанные файлы

| Назначение | Файл |
|------------|------|
| Хук иерархического «Назад» | `src/hooks/useHierarchicalBack.ts` |
| Лог навигации | `src/lib/navigation-log.ts` |
| Правила навигации | `.cursor/rules/hierarchical-navigation.mdc` |
| Дерево маршрутов | `docs/PAGES.md` |
| Страница edit (диалог «Назад») | `src/app/lobby/[gameId]/round/[roundNumber]/edit/page.tsx` |
| Лобби (редирект с edit + флаг диалога) | `src/app/lobby/[gameId]/page.tsx` (useLayoutEffect, ключи sessionStorage) |
