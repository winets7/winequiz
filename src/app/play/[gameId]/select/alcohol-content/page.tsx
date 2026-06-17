"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ALCOHOL_CONTENT_VALUES } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import { usePlayGuessStorage } from "@/hooks/usePlayGuessStorage";
import {
  PlaySelectScreen,
  PLAY_SELECT_INPUT_CLASS,
  playSelectListRowClass,
} from "@/components/game/play-select-screen";
import { dispatchWineGuessStorageChange } from "@/lib/wine-guess-storage";

export default function SelectAlcoholContentPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);
  const { userId, readStoredGuess, writeStoredGuess } = usePlayGuessStorage(gameId);

  const [selectedAlcohol, setSelectedAlcohol] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!userId) return;
    const saved = readStoredGuess().alcoholContent;
    if (saved) {
      setSelectedAlcohol(saved);
    }
  }, [userId, readStoredGuess]);

  const handleAlcoholSelect = (alcohol: string) => {
    if (!userId) return;
    setSelectedAlcohol(alcohol);
    writeStoredGuess({
      ...readStoredGuess(),
      alcoholContent: alcohol,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  const filteredAlcoholValues = ALCOHOL_CONTENT_VALUES.filter((value) =>
    value.includes(searchQuery)
  );

  return (
    <PlaySelectScreen
      barTitle="Крепость"
      heading="Крепость (%)"
      emoji="🥃"
      onBack={goBack}
    >
      <div className="space-y-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск крепости..."
          className={PLAY_SELECT_INPUT_CLASS}
        />

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredAlcoholValues.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleAlcoholSelect(value)}
              className={playSelectListRowClass(selectedAlcohol === value)}
            >
              {value}%
              {selectedAlcohol === value ? (
                <span className="ml-2">✓</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </PlaySelectScreen>
  );
}
