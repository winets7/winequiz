"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { GRAPE_VARIETIES } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";

export default function SelectGrapeVarietiesPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-grapeVarieties`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedGrapes(parsed);
        }
      } catch {
        // Игнорируем ошибки парсинга
      }
    }
  }, [gameId]);

  const toggleGrape = (grape: string) => {
    setSelectedGrapes((prev) => {
      if (prev.includes(grape)) {
        return prev.filter((g) => g !== grape);
      } else {
        return [...prev, grape];
      }
    });
  };

  const handleSave = () => {
    // Сохраняем в localStorage
    localStorage.setItem(`wine-guess-${gameId}-grapeVarieties`, JSON.stringify(selectedGrapes));
    // Отправляем кастомное событие для обновления состояния на странице раунда
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    // Возвращаемся на страницу раунда
    goBack();
  };

  const filteredGrapes = GRAPE_VARIETIES.filter((grape) =>
    grape.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen flex flex-col items-center pb-8">
      {/* === Верхняя панель === */}
      <div className="w-full sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={goBack}
            className="text-[var(--foreground)] hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <div className="text-sm font-bold text-[var(--primary)]">Сорта винограда</div>
          <div className="w-6"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🍇</div>
            <h1 className="text-xl font-bold">Сорта винограда</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Выберите один или несколько сортов
            </p>
          </div>

          {/* Поиск */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск сорта..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />

          {/* Выбранные сорта */}
          {selectedGrapes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedGrapes.map((grape) => (
                <span
                  key={grape}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full text-sm"
                >
                  {grape}
                  <button
                    onClick={() => toggleGrape(grape)}
                    className="hover:opacity-70 text-xs ml-1"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Список сортов */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredGrapes.map((grape) => (
              <button
                key={grape}
                onClick={() => toggleGrape(grape)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedGrapes.includes(grape)
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {grape}
                {selectedGrapes.includes(grape) && (
                  <span className="ml-2">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Кнопка сохранения */}
          <button
            onClick={handleSave}
            className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            ✅ Сохранить
          </button>
        </div>
      </div>
    </main>
  );
}
