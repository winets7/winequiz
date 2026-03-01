"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";

export default function SelectOakAgedPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [isOakAged, setIsOakAged] = useState<boolean | null>(null);

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-isOakAged`);
    if (saved !== null) {
      setIsOakAged(saved === "true");
    }
  }, [gameId]);

  const handleSelect = (value: boolean) => {
    setIsOakAged(value);
    // Сохраняем в localStorage
    localStorage.setItem(`wine-guess-${gameId}-isOakAged`, value.toString());
    // Отправляем кастомное событие для обновления состояния на странице раунда
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    // Возвращаемся на страницу раунда
    goBack();
  };

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
          <div className="text-sm font-bold text-[var(--primary)]">Выдержка в бочке</div>
          <div className="w-6"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🪵</div>
            <h1 className="text-xl font-bold">Выдержка в дубовой бочке</h1>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect(true)}
              className={`p-6 rounded-2xl text-center transition-all ${
                isOakAged === true
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="text-4xl mb-2">✅</div>
              <div className="text-lg font-medium">Да</div>
            </button>
            <button
              onClick={() => handleSelect(false)}
              className={`p-6 rounded-2xl text-center transition-all ${
                isOakAged === false
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="text-4xl mb-2">❌</div>
              <div className="text-lg font-medium">Нет</div>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
