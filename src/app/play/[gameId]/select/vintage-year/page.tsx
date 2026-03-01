"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { VINTAGE_YEARS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";

export default function SelectVintageYearPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-vintageYear`);
    if (saved) {
      setSelectedYear(saved);
    }
  }, [gameId]);

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    // Сохраняем в localStorage
    localStorage.setItem(`wine-guess-${gameId}-vintageYear`, year);
    // Отправляем кастомное событие для обновления состояния на странице раунда
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    // Возвращаемся на страницу раунда
    goBack();
  };

  const filteredYears = VINTAGE_YEARS.filter((year) =>
    year.includes(searchQuery)
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
          <div className="text-sm font-bold text-[var(--primary)]">Год урожая</div>
          <div className="w-6"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📅</div>
            <h1 className="text-xl font-bold">Год урожая</h1>
          </div>

          {/* Поиск */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск года..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />

          {/* Список годов */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredYears.map((year) => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedYear === year
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {year}
                {selectedYear === year && (
                  <span className="ml-2">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
