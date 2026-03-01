"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { WINE_COUNTRIES } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";

export default function SelectCountryPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-country`);
    if (saved) {
      setSelectedCountry(saved);
    }
  }, [gameId]);

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    // Сохраняем в localStorage
    localStorage.setItem(`wine-guess-${gameId}-country`, country);
    // Отправляем кастомное событие для обновления состояния на странице раунда
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    // Возвращаемся на страницу раунда
    goBack();
  };

  const filteredCountries = WINE_COUNTRIES.filter((country) =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="text-sm font-bold text-[var(--primary)]">Страна</div>
          <div className="w-6"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🌍</div>
            <h1 className="text-xl font-bold">Страна производства</h1>
          </div>

          {/* Поиск */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск страны..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />

          {/* Список стран */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredCountries.map((country) => (
              <button
                key={country}
                onClick={() => handleCountrySelect(country)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedCountry === country
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {country}
                {selectedCountry === country && (
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
