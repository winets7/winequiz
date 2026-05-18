"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { COMPOSITION_LABELS } from "@/lib/wine-data";
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

export default function SelectCompositionPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedComposition, setSelectedComposition] = useState<string>("");

  useEffect(() => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    const saved = readWineGuessFromLocalStorage(gameId, roundNumber).composition;
    if (saved) {
      setSelectedComposition(saved);
    }
  }, [gameId]);

  const handleCompositionSelect = (composition: string) => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    setSelectedComposition(composition);
    writeWineGuessToLocalStorage(gameId, roundNumber, {
      ...readWineGuessFromLocalStorage(gameId, roundNumber),
      composition,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  return (
    <PlaySelectScreen
      barTitle="Состав"
      heading="Состав"
      emoji="🔀"
      onBack={goBack}
    >
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(COMPOSITION_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => handleCompositionSelect(value)}
            className={playSelectGridOptionClass(selectedComposition === value)}
          >
            <div className="mb-2 text-2xl">{value === "MONO" ? "🍇" : "🔀"}</div>
            <div className="text-lg font-medium">{label}</div>
          </button>
        ))}
      </div>
    </PlaySelectScreen>
  );
}
