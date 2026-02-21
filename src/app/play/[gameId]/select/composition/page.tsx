"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { COMPOSITION_LABELS } from "@/lib/wine-data";

export default function SelectCompositionPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [selectedComposition, setSelectedComposition] = useState<string>("");

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-composition`);
    if (saved) {
      setSelectedComposition(saved);
    }
  }, [gameId]);

  const handleCompositionSelect = (composition: string) => {
    setSelectedComposition(composition);
    // Сохраняем в localStorage
    localStorage.setItem(`wine-guess-${gameId}-composition`, composition);
    // Отправляем кастомное событие для обновления состояния на странице раунда
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    // Возвращаемся на страницу раунда
    router.push(`/play/${gameId}`);
  };

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
          <div className="text-sm font-bold text-[var(--primary)]">Состав</div>
          <div className="w-6"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔀</div>
            <h1 className="text-xl font-bold">Состав</h1>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(COMPOSITION_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleCompositionSelect(value)}
                className={`p-6 rounded-2xl text-center transition-all ${
                  selectedComposition === value
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                <div className="text-2xl mb-2">{value === "MONO" ? "🍇" : "🔀"}</div>
                <div className="text-lg font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
