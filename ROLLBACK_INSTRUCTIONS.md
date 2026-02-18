# Инструкция по откату изменений цветовой схемы

## Что было изменено

1. **Улучшена цветовая схема:**
   - Осветлён фон в светлой теме (с #FFFBF5 на #FFFFFF)
   - Усилен контраст текста (с #1F1215 на #0F0F0F)
   - Более насыщенные акцентные цвета
   - Улучшены цвета для тёмной темы

2. **Добавлены градиенты:**
   - Градиентные кнопки с эффектом hover
   - Улучшенные тени для карточек
   - Плавные переходы и анимации

3. **Обновлены компоненты:**
   - Главная страница (src/app/page.tsx)
   - Карточки характеристик (src/components/game/characteristic-cards.tsx)

## Как откатить изменения

### Вариант 1: Быстрый откат (рекомендуется)

Просто замените файл `src/app/globals.css` содержимым из резервной копии:

```bash
# Windows PowerShell
Copy-Item src/app/globals.css.backup src/app/globals.css -Force

# Linux/Mac
cp src/app/globals.css.backup src/app/globals.css
```

Затем откатите изменения в компонентах через git:

```bash
git checkout src/app/page.tsx
git checkout src/components/game/characteristic-cards.tsx
```

### Вариант 2: Ручной откат

1. Откройте `src/app/globals.css.backup`
2. Скопируйте всё содержимое
3. Вставьте в `src/app/globals.css`, заменив текущее содержимое
4. Откатите изменения в компонентах через git или вручную

### Вариант 3: Через Git (если изменения закоммичены)

```bash
git checkout HEAD -- src/app/globals.css
git checkout HEAD -- src/app/page.tsx
git checkout HEAD -- src/components/game/characteristic-cards.tsx
```

## Файлы, которые были изменены

- ✅ `src/app/globals.css` (резервная копия: `src/app/globals.css.backup`)
- ✅ `src/app/page.tsx`
- ✅ `src/components/game/characteristic-cards.tsx`

## Что останется после отката

После отката приложение вернётся к исходной цветовой схеме:
- Кремовый фон (#FFFBF5) в светлой теме
- Бордовый основной цвет (#722F37)
- Без градиентов на кнопках
- Исходные тени и эффекты

---

**Примечание:** Резервная копия сохранена в `src/app/globals.css.backup` и может быть удалена после успешного отката, если изменения не понравились.
