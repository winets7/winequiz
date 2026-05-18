"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { WINE_COUNTRIES } from "@/lib/wine-data";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  PlaySelectScreen,
  PLAY_SELECT_INPUT_CLASS,
  playSelectListRowClass,
} from "@/components/game/play-select-screen";
import {
  dispatchWineGuessStorageChange,
  getActivePlayRoundNumber,
  readWineGuessFromLocalStorage,
  writeWineGuessToLocalStorage,
} from "@/lib/wine-guess-storage";

export default function SelectCountryPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const goBack = useHierarchicalBack(`/play/${gameId}`);

  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    const saved = readWineGuessFromLocalStorage(gameId, roundNumber).country;
    if (saved) {
      setSelectedCountry(saved);
    }
  }, [gameId]);

  const handleCountrySelect = (country: string) => {
    const roundNumber = getActivePlayRoundNumber(gameId);
    setSelectedCountry(country);
    writeWineGuessToLocalStorage(gameId, roundNumber, {
      ...readWineGuessFromLocalStorage(gameId, roundNumber),
      country,
    });
    dispatchWineGuessStorageChange();
    goBack();
  };

  const filteredCountries = WINE_COUNTRIES.filter((country) =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PlaySelectScreen
      barTitle="Страна"
      heading="Страна производства"
      emoji="🌍"
      onBack={goBack}
    >
      <div className="space-y-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск страны..."
          className={PLAY_SELECT_INPUT_CLASS}
        />

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredCountries.map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => handleCountrySelect(country)}
              className={playSelectListRowClass(selectedCountry === country)}
            >
              {country}
              {selectedCountry === country ? (
                <span className="ml-2">✓</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </PlaySelectScreen>
  );
}
