"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { COLOR_LABELS, COLOR_ICONS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  PlaySelectScreen,
  playSelectGridOptionClass,
} from "@/components/game/play-select-screen";

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
    <PlaySelectScreen
      barTitle="Цвет вина"
      heading="Цвет вина"
      emoji="🎨"
      onBack={goBack}
    >
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(COLOR_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => handleColorSelect(value)}
            className={playSelectGridOptionClass(selectedColor === value)}
          >
            <div className="mb-2 text-4xl">{COLOR_ICONS[value]}</div>
            <div className="text-lg font-medium">{label}</div>
          </button>
        ))}
      </div>
    </PlaySelectScreen>
  );
}
