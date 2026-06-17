"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import { usePlayGuessStorage } from "@/hooks/usePlayGuessStorage";
import {
  PlaySelectScreen,
  playSelectGridOptionClass,
} from "@/components/game/play-select-screen";
import { dispatchWineGuessStorageChange } from "@/lib/wine-guess-storage";

export default function SelectOakAgedPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);
  const { userId, readStoredGuess, writeStoredGuess } = usePlayGuessStorage(gameId);

  const [isOakAged, setIsOakAged] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    const saved = readStoredGuess().isOakAged;
    if (saved !== null && saved !== undefined) {
      setIsOakAged(saved);
    }
  }, [userId, readStoredGuess]);

  const handleSelect = (value: boolean) => {
    if (!userId) return;
    setIsOakAged(value);
    writeStoredGuess({
      ...readStoredGuess(),
      isOakAged: value,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  return (
    <PlaySelectScreen
      barTitle="Выдержка в бочке"
      heading="Выдержка в дубовой бочке"
      emoji="🪵"
      onBack={goBack}
    >
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleSelect(true)}
          className={playSelectGridOptionClass(isOakAged === true)}
        >
          <div className="mb-2 text-4xl">✅</div>
          <div className="text-lg font-medium">Да</div>
        </button>
        <button
          type="button"
          onClick={() => handleSelect(false)}
          className={playSelectGridOptionClass(isOakAged === false)}
        >
          <div className="mb-2 text-4xl">❌</div>
          <div className="text-lg font-medium">Нет</div>
        </button>
      </div>
    </PlaySelectScreen>
  );
}
