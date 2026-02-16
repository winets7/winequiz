"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ALCOHOL_CONTENT_VALUES } from "@/lib/wine-data";

export default function SelectAlcoholContentPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [selectedAlcohol, setSelectedAlcohol] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-alcoholContent`);
    if (saved) {
      setSelectedAlcohol(saved);
    }
  }, [gameId]);

  const handleAlcoholSelect = (alcohol: string) => {
    setSelectedAlcohol(alcohol);
    // Сохраняем в localStorage
    localStorage.setItem(`wine-guess-${gameId}-alcoholContent`, alcohol);
    // Отправляем кастомное событие для обновления состояния на странице раунда
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    // Возвращаемся на страницу раунда
    router.push(`/play/${gameId}`);
  };

  const filteredAlcoholValues = ALCOHOL_CONTENT_VALUES.filter((value) =>
    value.includes(searchQuery)
  );

  return (
    <main className="min-h-screen flex flex-col items-center pb-8">
      {/* === Верхняя панель === */}
      <div className="w-full sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/play/${gameId}`)}
            className="text-[var(--foreground)] hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <div className="text-sm font-bold text-[var(--primary)]">Крепость</div>
          <div className="w-6"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🥃</div>
            <h1 className="text-xl font-bold">Крепость (%)</h1>
          </div>

          {/* Поиск */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск крепости..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />

          {/* Список значений крепости */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAlcoholValues.map((value) => (
              <button
                key={value}
                onClick={() => handleAlcoholSelect(value)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedAlcohol === value
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {value}%
                {selectedAlcohol === value && (
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
