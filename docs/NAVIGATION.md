# Навигация: открытие страниц и возвраты

Документ фиксирует **все точки входа** (как пользователь попадает на страницу) и **возвраты** (кнопка «Назад» / свайп / программный переход назад). Используется Next.js App Router, `useRouter`, `router.push`/`router.replace`, хук `useHierarchicalBack` и ручная работа с `history` для иерархического «Назад».

---

## 1. Точки входа (откуда открываются страницы)

### Главная `/`
- **Прямой заход** по URL или по корню сайта.
- **После логина/регистрации**: `register` → `router.push("/")` или `router.push("/login")`; `login` → `router.push("/")`.

### Логин `/login`
- **С главной**: `Link href="/login"` (незалогиненный пользователь).
- **После регистрации**: `router.push("/login")`.

### Регистрация `/register`
- **С главной**: `Link href="/register"`.

### Присоединение по коду `/join/[code]`
- **С главной**: ввод кода → `router.push(\`/join/${fullCode}\`)` (например `WN-482917`).

### Профиль `/profile`, `/profile/[id]`
- **Свой профиль**: `Link href="/profile"` с главной (аватар слева вверху и ссылка «Профиль» внизу).
- **Чужой профиль**: `profile-games.tsx` → `router.push(\`/profile/${player.user.id}\`)` (из списка игр в профиле); `player-rounds-list.tsx` — переход в профиль по клику на игрока (если есть).

### Игра (игрок) `/play/[gameId]`
- **После присоединения**: `join/[code]` → кнопка «Играть» → `router.push(\`/play/${gameId}\`)`.
- **Из профиля**: `profile-games.tsx` → `router.push(gameLink)` (ссылка на игру) или `router.push(\`/history/${game.id}\`)`; из истории можно перейти в игру.
- **Со scoreboard**: `scoreboard/[gameId]` → кнопка → `router.push(\`/play/${gameId}\`)`.
- **Из лобби (игрок не хост)**: через общий поток (например после join).

### Выбор характеристики (игрок) `/play/[gameId]/select/[characteristic]`
- **Со страницы игры** `/play/[gameId]`: клик по карточке характеристики в `CharacteristicCards` → `router.push(\`/play/${gameId}/select/${path}\`)`. Порядок характеристик: color → sweetness → composition → grape-varieties → country → vintage-year → alcohol-content → oak-aged.

### Лобби (хост) `/lobby/[gameId]`
- **С главной**: после «Создать игру» (POST `/api/games`) → `router.push(\`/lobby/${game.id}\`)`.

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
| `/play/[gameId]` | `/profile/[id]` или `/profile` | `useHierarchicalBack(profilePath)` |
| `/play/[gameId]/select/*` | `/play/[gameId]` | `useHierarchicalBack(\`/play/${gameId}\`)` |
| `/lobby/[gameId]` | `/profile/[id]` или `/profile` | `useHierarchicalBack(profilePath, { enabled: !!game })` |
| `/lobby/[gameId]/round/[n]/edit` | `/lobby/[gameId]` | Ручная запись в history (parentPath = lobby) + свой `popstate`: при «Назад» остаёмся на edit и показываем диалог «Сохранить?»; при подтверждении выхода — переход в лобби |
| `/lobby/[gameId]/round/[n]/select/[characteristic]` | `/lobby/[gameId]/round/[n]/edit` | `useHierarchicalBack(editUrl)`; после выбора значения — `router.replace(editUrl)` + sessionStorage `hierarchical-back-from-select` для схлопывания истории |

**Особенности:**
- **Лобби → edit**: при браузерном «Назад» с edit лобби перехватывает (useLayoutEffect + sessionStorage), делает `router.replace(editUrl)` и выставляет флаг показа диалога «Сохранить?».
- **Edit**: при «Назад» не уходим сразу в лобби, а показываем диалог; при выходе — переход в лобби (`router.replace(target)`).
- **Select (хост)**: после сохранения значения — `router.replace(editUrl)`, без лишней записи в history; флаг `hierarchical-back-from-select` обрабатывается в edit для `history.go(-1)` при необходимости.

---

## 3. Действия по страницам (краткая таблица)

| Действие | Откуда | Куда |
|----------|--------|------|
| Войти | `/` | `/login` (Link) |
| Зарегистрироваться | `/` | `/register` (Link) |
| После входа | `/login` | `/` |
| После регистрации | `/register` | `/` или `/login` |
| Создать игру | `/` | `/lobby/[gameId]` (router.push) |
| Присоединиться по коду | `/` | `/join/[code]` (router.push) |
| В игру после join | `/join/[code]` | `/play/[gameId]` (router.push) |
| Профиль | `/` | `/profile` (Link) |
| Профиль игрока | профиль (список игр) | `/profile/[id]` (router.push) |
| История игры | профиль / игра | `/history/[gameId]` (router.push) |
| В игру из истории/профиля | профиль | `/play/[gameId]` или `/history/[gameId]` |
| Выбор характеристики (игрок) | `/play/[gameId]` | `/play/[gameId]/select/[characteristic]` (router.push из CharacteristicCards) |
| Редактировать раунд | `/lobby/[gameId]` | `/lobby/[gameId]/round/[n]/edit` (router.push) |
| Выбор характеристики (хост) | edit раунда | `/lobby/.../round/[n]/select/[characteristic]` (router.push из HostRoundCharacteristicCards) |
| Назад (игрок, экран игры) | `/play/[gameId]` | `/profile/[id]` (goBack) |
| Назад (игрок, выбор характеристики) | `/play/.../select/*` | `/play/[gameId]` (goBack) |
| Назад (хост, лобби) | `/lobby/[gameId]` | `/profile/[id]` (goBack) |
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
