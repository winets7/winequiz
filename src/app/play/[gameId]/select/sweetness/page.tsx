"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { SWEETNESS_LABELS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  PlaySelectScreen,
  playSelectGridOptionClass,
} from "@/components/game/play-select-screen";
import {
  dispatchWineGuessStorageChange,
  getActivePlayRoundNumber,
  readWineGuessFromLocalStorage,
  writeWineGuessToLocalStorage,
} from "@/lib/wine-guess-storage";

export default function SelectSweetnessPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedSweetness, setSelectedSweetness] = useState<string>("");

  useEffect(() => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    const saved = readWineGuessFromLocalStorage(gameId, roundNumber).sweetness;
    if (saved) {
      setSelectedSweetness(saved);
    }
  }, [gameId]);

  const handleSweetnessSelect = (sweetness: string) => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    setSelectedSweetness(sweetness);
    writeWineGuessToLocalStorage(gameId, roundNumber, {
      ...readWineGuessFromLocalStorage(gameId, roundNumber),
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
