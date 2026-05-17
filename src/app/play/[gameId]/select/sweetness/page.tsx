"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { SWEETNESS_LABELS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  PlaySelectScreen,
  playSelectGridOptionClass,
} from "@/components/game/play-select-screen";

export default function SelectSweetnessPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedSweetness, setSelectedSweetness] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-sweetness`);
    if (saved) {
      setSelectedSweetness(saved);
    }
  }, [gameId]);

  const handleSweetnessSelect = (sweetness: string) => {
    setSelectedSweetness(sweetness);
    localStorage.setItem(`wine-guess-${gameId}-sweetness`, sweetness);
    window.dispatchEvent(new CustomEvent("localStorageChange"));
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
