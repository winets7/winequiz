# Структура страниц сайта

Иерархия маршрутов приложения (Next.js App Router). Каждый маршрут соответствует файлу `page.tsx` в `src/app/`.

---

## Дерево маршрутов

```
/
├── /                          — Главная (создание игры / вход по коду)
├── /login                     — Вход
├── /register                  — Регистрация
├── /offline                   — Офлайн-страница
├── /join/[code]               — Присоединение к игре по коду
├── /profile                   — Свой профиль
├── /profile/[id]              — Профиль пользователя по id
│
├── /play/[gameId]             — Игра (страница раунда, ответы, результаты)
│   └── /play/[gameId]/select/
│       ├── color              — Выбор цвета вина
│       ├── sweetness          — Выбор сладости
│       ├── composition        — Выбор состава
│       ├── grape-varieties    — Выбор сортов винограда
│       ├── country            — Выбор страны
│       ├── vintage-year       — Выбор года урожая
│       ├── alcohol-content    — Выбор крепости
│       └── oak-aged           — Выбор выдержки в бочке
│
├── /lobby/[gameId]            — Лобби игры (хост)
│   └── /lobby/[gameId]/round/[roundNumber]/
│       ├── edit               — Редактирование раунда (параметры вина)
│       └── select/[characteristic]  — Выбор характеристики (color, sweetness, …)
│
├── /history/[gameId]          — История игры
└── /scoreboard/[gameId]       — Таблица результатов (трансляция)
```

---

## Сводная таблица

| Маршрут | Описание |
|--------|----------|
| `/` | Главная |
| `/login` | Вход |
| `/register` | Регистрация |
| `/offline` | Офлайн |
| `/join/[code]` | Присоединение по коду |
| `/profile` | Свой профиль |
| `/profile/[id]` | Профиль пользователя |
| `/play/[gameId]` | Страница игры |
| `/play/[gameId]/select/color` | Выбор цвета |
| `/play/[gameId]/select/sweetness` | Выбор сладости |
| `/play/[gameId]/select/composition` | Выбор состава |
| `/play/[gameId]/select/grape-varieties` | Выбор сортов винограда |
| `/play/[gameId]/select/country` | Выбор страны |
| `/play/[gameId]/select/vintage-year` | Выбор года урожая |
| `/play/[gameId]/select/alcohol-content` | Выбор крепости |
| `/play/[gameId]/select/oak-aged` | Выбор выдержки в бочке |
| `/lobby/[gameId]` | Лобби игры |
| `/lobby/[gameId]/round/[roundNumber]/edit` | Редактирование раунда |
| `/lobby/[gameId]/round/[roundNumber]/select/[characteristic]` | Выбор характеристики раунда |
| `/history/[gameId]` | История игры |
| `/scoreboard/[gameId]` | Таблица результатов |

---

## Иерархия возврата (кнопка «Назад» / свайп)

| Страница | Возврат ведёт на |
|----------|------------------|
| `play/[gameId]` | `/profile/[id]` |
| `play/[gameId]/select/*` | `/play/[gameId]` |
| `lobby/[gameId]/round/[n]/select/[characteristic]` | `/lobby/[gameId]/round/[n]/edit` |
| `lobby/[gameId]/round/[n]/edit` | `/lobby/[gameId]` |
