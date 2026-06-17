"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { SWEETNESS_LABELS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import { usePlayGuessStorage } from "@/hooks/usePlayGuessStorage";
import {
  PlaySelectScreen,
  playSelectGridOptionClass,
} from "@/components/game/play-select-screen";
import { dispatchWineGuessStorageChange } from "@/lib/wine-guess-storage";

export default function SelectSweetnessPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);
  const { userId, readStoredGuess, writeStoredGuess } = usePlayGuessStorage(gameId);

  const [selectedSweetness, setSelectedSweetness] = useState<string>("");

  useEffect(() => {
    if (!userId) return;
    const saved = readStoredGuess().sweetness;
    if (saved) {
      setSelectedSweetness(saved);
    }
  }, [userId, readStoredGuess]);

  const handleSweetnessSelect = (sweetness: string) => {
    if (!userId) return;
    setSelectedSweetness(sweetness);
    writeStoredGuess({
      ...readStoredGuess(),
      sweetness,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  return (
    <PlaySelectScreen
      barTitle="Сладость"
      heading="Сладость"
      emoji="🍬"
      onBack={goBack}
    >
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(SWEETNESS_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSweetnessSelect(value)}
            className={playSelectGridOptionClass(selectedSweetness === value)}
          >
            <div className="text-lg font-medium">{label}</div>
          </button>
        ))}
      </div>
    </PlaySelectScreen>
  );
}
