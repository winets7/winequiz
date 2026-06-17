"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { GRAPE_VARIETIES } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import { usePlayGuessStorage } from "@/hooks/usePlayGuessStorage";
import {
  PlaySelectScreen,
  PLAY_SELECT_CHIP_CLASS,
  PLAY_SELECT_INPUT_CLASS,
  PLAY_SELECT_SAVE_BUTTON_CLASS,
  playSelectListRowClass,
} from "@/components/game/play-select-screen";
import { dispatchWineGuessStorageChange } from "@/lib/wine-guess-storage";

export default function SelectGrapeVarietiesPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);
  const { userId, readStoredGuess, writeStoredGuess } = usePlayGuessStorage(gameId);

  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!userId) return;
    const saved = readStoredGuess().grapeVarieties;
    if (saved && saved.length > 0) {
      setSelectedGrapes(saved);
    }
  }, [userId, readStoredGuess]);

  const toggleGrape = (grape: string) => {
    setSelectedGrapes((prev) =>
      prev.includes(grape) ? prev.filter((g) => g !== grape) : [...prev, grape]
    );
  };

  const handleSave = () => {
    if (!userId) return;
    writeStoredGuess({
      ...readStoredGuess(),
      grapeVarieties: selectedGrapes,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  const filteredGrapes = GRAPE_VARIETIES.filter((grape) =>
    grape.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PlaySelectScreen
      barTitle="Сорта винограда"
      heading="Сорта винограда"
      emoji="🍇"
      subtitle="Выберите один или несколько сортов"
      onBack={goBack}
    >
      <div className="space-y-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск сорта..."
          className={PLAY_SELECT_INPUT_CLASS}
        />

        {selectedGrapes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedGrapes.map((grape) => (
              <span key={grape} className={PLAY_SELECT_CHIP_CLASS}>
                {grape}
                <button
                  type="button"
                  onClick={() => toggleGrape(grape)}
                  className="ml-1 text-xs hover:opacity-70"
                  aria-label={`Убрать ${grape}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredGrapes.map((grape) => (
            <button
              key={grape}
              type="button"
              onClick={() => toggleGrape(grape)}
              className={playSelectListRowClass(selectedGrapes.includes(grape))}
            >
              {grape}
              {selectedGrapes.includes(grape) ? (
                <span className="ml-2">✓</span>
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className={PLAY_SELECT_SAVE_BUTTON_CLASS}
        >
          ✅ Сохранить
        </button>
      </div>
    </PlaySelectScreen>
  );
}
