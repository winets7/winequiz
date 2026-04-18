# Структура страниц сайта

Иерархия маршрутов Next.js App Router: каждый маршрут — файл `page.tsx` в `src/app/`.

Подробно про **входы на страницы и возвраты** — в [NAVIGATION.md](./NAVIGATION.md). Ниже — компактная карта URL и иерархия «Назад» там, где задана в коде (`useHierarchicalBack`).

---

## Дерево маршрутов

```
/
├── /                          — Хаб: выбор игры (залогинен) / вход и регистрация (гость)
├── /login                     — Вход
├── /register                  — Регистрация
├── /offline                   — Офлайн (PWA)
│
├── /games
│   ├── /games/wine-quiz       — Винная викторина: создание игры, присоединение по коду
│   ├── /games/wine-nose       — «Нос вина» (заглушка)
│   └── /games/barramundi      — Баррамунди (заглушка)
│
├── /join/[code]               — Экран присоединения по коду (из викторины)
├── /profile                   — Свой профиль
├── /profile/[id]              — Профиль пользователя по id
│
├── /play/[gameId]             — Экран игрока: раунд, ответы, результаты
│   └── /play/[gameId]/select/
│       ├── color              — Цвет вина
│       ├── sweetness          — Сладость
│       ├── composition        — Состав
│       ├── grape-varieties    — Сорта винограда
│       ├── country            — Страна
│       ├── vintage-year       — Год урожая
│       ├── alcohol-content    — Крепость
│       └── oak-aged           — Выдержка в дубе
│
├── /lobby/[gameId]            — Лобби (хост)
│   └── /lobby/[gameId]/round/[roundNumber]/
│       ├── edit               — Параметры вина раунда
│       └── select/[characteristic]  — color, sweetness, … (как у игрока)
│
├── /history/[gameId]          — История игры
└── /scoreboard/[gameId]       — Таблица результатов (трансляция)
```

Порядок характеристик в игре (карточки на `/play/[gameId]` и в лобби): **color → sweetness → composition → grape-varieties → country → vintage-year → alcohol-content → oak-aged** (см. [NAVIGATION.md](./NAVIGATION.md)).

---

## Сводные таблицы по зонам

### Учётная запись и служебное

| Маршрут | Описание |
|--------|----------|
| `/` | Хаб игр / кнопки входа и регистрации |
| `/login` | Вход |
| `/register` | Регистрация |
| `/offline` | Офлайн-страница |

### Игры и профиль

| Маршрут | Описание |
|--------|----------|
| `/games/wine-quiz` | Винная викторина: логотип, создание игры, ввод кода |
| `/games/wine-nose` | Нос вина (в разработке) |
| `/games/barramundi` | Баррамунди (в разработке) |
| `/join/[code]` | Присоединение к игре по коду |
| `/profile` | Свой профиль |
| `/profile/[id]` | Чужой профиль |

### Игрок (винная викторина)

| Маршрут | Описание |
|--------|----------|
| `/play/[gameId]` | Экран игры |
| `/play/[gameId]/select/color` | Выбор цвета |
| `/play/[gameId]/select/sweetness` | Выбор сладости |
| `/play/[gameId]/select/composition` | Выбор состава |
| `/play/[gameId]/select/grape-varieties` | Выбор сортов |
| `/play/[gameId]/select/country` | Выбор страны |
| `/play/[gameId]/select/vintage-year` | Выбор года |
| `/play/[gameId]/select/alcohol-content` | Выбор крепости |
| `/play/[gameId]/select/oak-aged` | Выбор выдержки в бочке |

### Хост и результаты

| Маршрут | Описание |
|--------|----------|
| `/lobby/[gameId]` | Лобби игры |
| `/lobby/[gameId]/round/[roundNumber]/edit` | Редактирование раунда |
| `/lobby/[gameId]/round/[roundNumber]/select/[characteristic]` | Выбор характеристики для раунда |
| `/history/[gameId]` | История игры |
| `/scoreboard/[gameId]` | Таблица результатов |

---

## Иерархия возврата (кнопка «Назад» / свайп, `useHierarchicalBack`)

| Страница | Родитель (куда ведёт возврат) |
|----------|-------------------------------|
| `/play/[gameId]` | `/games/wine-quiz` |
| `/play/[gameId]/select/*` | `/play/[gameId]` |
| `/lobby/[gameId]` | `/games/wine-quiz` |
| `/lobby/[gameId]/round/[n]/select/[characteristic]` | `/lobby/[gameId]/round/[n]/edit` |
| `/lobby/[gameId]/round/[n]/edit` | `/lobby/[gameId]` (через диалог «Сохранить?» при уходе браузерным «Назад» — см. [NAVIGATION.md](./NAVIGATION.md)) |

---

## Правила лобби (хост)

**Изменение количества раундов** (добавление или удаление раунда) разрешено **только пока игра в статусе WAITING**. После старта (`PLAYING`) число раундов менять нельзя.
