"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getVintageYears } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  PlaySelectScreen,
  PlaySelectGridPanel,
  PLAY_SELECT_INPUT_CLASS,
  playSelectGridOptionClass,
} from "@/components/game/play-select-screen";
import {
  dispatchWineGuessStorageChange,
  getActivePlayRoundNumber,
  readWineGuessFromLocalStorage,
  writeWineGuessToLocalStorage,
} from "@/lib/wine-guess-storage";

export default function SelectVintageYearPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    const saved = readWineGuessFromLocalStorage(gameId, roundNumber).vintageYear;
    if (saved) {
      setSelectedYear(saved);
    }
  }, [gameId]);

  const handleYearSelect = (year: string) => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    setSelectedYear(year);
    writeWineGuessToLocalStorage(gameId, roundNumber, {
      ...readWineGuessFromLocalStorage(gameId, roundNumber),
      vintageYear: year,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  const filteredYears = getVintageYears().filter((year) =>
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

        <PlaySelectGridPanel innerClassName="grid grid-cols-4 gap-2 sm:gap-3">
          {filteredYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleYearSelect(year)}
              className={`${playSelectGridOptionClass(selectedYear === year)} !p-3 text-sm sm:text-base`}
            >
              {year}
              {selectedYear === year ? (
                <span className="mt-0.5 block text-xs">✓</span>
              ) : null}
            </button>
          ))}
        </PlaySelectGridPanel>
      </div>
    </PlaySelectScreen>
  );
}
