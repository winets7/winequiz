"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WineParams } from "@/components/game/wine-form";
import {
  getActivePlayRoundNumber,
  readWineGuessFromLocalStorage,
  writeWineGuessToLocalStorage,
} from "@/lib/wine-guess-storage";

export function usePlayGuessStorage(gameId: string) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const getRoundNumber = useCallback(() => {
    if (!userId) return 1;
    return getActivePlayRoundNumber(gameId, userId);
  }, [gameId, userId]);

  const readStoredGuess = useCallback(
    (roundNumber?: number) => {
      if (!userId) {
        return readWineGuessFromLocalStorage(gameId, "", roundNumber ?? 1);
      }
      return readWineGuessFromLocalStorage(
        gameId,
        userId,
        roundNumber ?? getRoundNumber()
      );
    },
    [gameId, userId, getRoundNumber]
  );

  const writeStoredGuess = useCallback(
    (values: Partial<WineParams>, roundNumber?: number) => {
      if (!userId) return;
      writeWineGuessToLocalStorage(
        gameId,
        userId,
        roundNumber ?? getRoundNumber(),
        values
      );
    },
    [gameId, userId, getRoundNumber]
  );

  return { userId, getRoundNumber, readStoredGuess, writeStoredGuess };
}
