"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SelectVintageYearPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [year, setYear] = useState<string>("");

  // Загружаем сохраненное значение из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-vintageYear`);
    if (saved) {
      setYear(saved);
    }
  }, [gameId]);

  const handleSave = () => {
    // Сохраняем в localStorage
    if (year.trim()) {
      localStorage.setItem(`wine-guess-${gameId}-vintageYear`, year.trim());
    } else {
      localStorage.removeItem(`wine-guess-${gameId}-vintageYear`);
    }
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

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2020"
            min="1900"
            max="2030"
            className="w-full px-4 py-4 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)] text-lg text-center"
          />

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
