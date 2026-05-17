"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { VINTAGE_YEARS } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  PlaySelectScreen,
  PLAY_SELECT_INPUT_CLASS,
  playSelectListRowClass,
} from "@/components/game/play-select-screen";

export default function SelectVintageYearPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`wine-guess-${gameId}-vintageYear`);
    if (saved) {
      setSelectedYear(saved);
    }
  }, [gameId]);

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    localStorage.setItem(`wine-guess-${gameId}-vintageYear`, year);
    window.dispatchEvent(new CustomEvent("localStorageChange"));
    goBack();
  };

  const filteredYears = VINTAGE_YEARS.filter((year) =>
    year.includes(searchQuery)
  );

  return (
    <PlaySelectScreen
      barTitle="Год урожая"
      heading="Год урожая"
      emoji="📅"
      onBack={goBack}
    >
      <div className="space-y-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск года..."
          className={PLAY_SELECT_INPUT_CLASS}
        />

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleYearSelect(year)}
              className={playSelectListRowClass(selectedYear === year)}
            >
              {year}
              {selectedYear === year ? <span className="ml-2">✓</span> : null}
            </button>
          ))}
        </div>
      </div>
    </PlaySelectScreen>
  );
}
