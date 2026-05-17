"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { COLOR_LABELS, COLOR_ICONS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";

/** См. `.cursor/rules/wine-quiz-active-game-cards.mdc` */
const playSelectPageBg =
  "bg-[url('/pic/fon.png')] bg-cover bg-center bg-no-repeat";

const playSelectCardBase =
  "rounded-2xl border-4 p-6 text-center transition-all focus:outline-none focus:ring-2 focus:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]";

export default function SelectColorPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedColor, setSelectedColor] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-color`);
    if (saved) {
      setSelectedColor(saved);
    }
  }, [gameId]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    localStorage.setItem(`wine-guess-${gameId}-color`, color);
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    goBack();
  };

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center pb-8 ${playSelectPageBg}`}
    >
      <div className="sticky top-0 z-10 w-full border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/65">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={goBack}
            className="p-1 text-[var(--foreground)] transition-opacity hover:opacity-70"
            aria-label="Назад"
          >
            ←
          </button>
          <div className="text-sm font-bold text-[var(--primary)]">Цвет вина</div>
          <div className="w-6" aria-hidden />
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-lg px-4">
        <div className="mb-6 space-y-4 text-center">
          <div className="text-4xl" aria-hidden>
            🎨
          </div>
          <h1 className="wine-quiz-page-title text-2xl font-bold sm:text-3xl">
            Цвет вина
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(COLOR_LABELS).map(([value, label]) => {
            const isSelected = selectedColor === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleColorSelect(value)}
                className={`${playSelectCardBase} ${
                  isSelected
                    ? "scale-105 border-[var(--wine-quiz-active-game-card-border-hover)] bg-[var(--wine-quiz-active-game-card-bg-hover)] font-bold text-[var(--foreground)] shadow-lg"
                    : "border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] text-[var(--foreground)] hover:border-[var(--wine-quiz-active-game-card-border-hover)] hover:bg-[var(--wine-quiz-active-game-card-bg-hover)]"
                }`}
              >
                <div className="mb-2 text-4xl">{COLOR_ICONS[value]}</div>
                <div className="text-lg font-medium">{label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
