import type { WineParams } from "@/components/game/wine-form";

const GUESS_FIELDS = [
  "color",
  "sweetness",
  "composition",
  "country",
  "vintageYear",
  "alcoholContent",
  "grapeVarieties",
  "isOakAged",
] as const;

const EMPTY_WINE_GUESS: Partial<WineParams> = {
  color: "",
  sweetness: "",
  composition: "",
  country: "",
  vintageYear: "",
  alcoholContent: "",
  grapeVarieties: [],
  isOakAged: null,
};

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Ключи до фикса (без userId) — общие на устройство, больше не читаем. */
function legacyWineGuessFieldKey(gameId: string, field: string): string {
  return `wine-guess-${gameId}-${field}`;
}

function legacyRoundWineGuessFieldKey(
  gameId: string,
  roundNumber: number,
  field: string
): string {
  return `wine-guess-${gameId}-r${roundNumber}-${field}`;
}

export function activePlayRoundStorageKey(gameId: string, userId: string): string {
  return `wine-guess-${gameId}-u${userId}-activeRound`;
}

export function getActivePlayRoundNumber(gameId: string, userId: string): number {
  if (!hasLocalStorage() || !userId) return 1;
  const stored = localStorage.getItem(activePlayRoundStorageKey(gameId, userId));
  const n = stored ? parseInt(stored, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function setActivePlayRoundNumber(
  gameId: string,
  userId: string,
  roundNumber: number
): void {
  if (!hasLocalStorage() || !userId) return;
  localStorage.setItem(activePlayRoundStorageKey(gameId, userId), String(roundNumber));
}

export function wineGuessFieldKey(
  gameId: string,
  userId: string,
  roundNumber: number,
  field: string
): string {
  return `wine-guess-${gameId}-u${userId}-r${roundNumber}-${field}`;
}

export function isWineGuessDraftEmpty(values: Partial<WineParams>): boolean {
  const grapeVarieties = values.grapeVarieties ?? [];
  return (
    grapeVarieties.length === 0 &&
    !values.sweetness &&
    !String(values.vintageYear ?? "").trim() &&
    !values.country &&
    !String(values.alcoholContent ?? "").trim() &&
    (values.isOakAged === null || values.isOakAged === undefined) &&
    !values.color &&
    !values.composition
  );
}

/** Удаляет устаревшие ключи без userId (общие на устройство). */
export function purgeLegacyWineGuessKeys(gameId: string): void {
  if (!hasLocalStorage()) return;
  for (const field of GUESS_FIELDS) {
    localStorage.removeItem(legacyWineGuessFieldKey(gameId, field));
  }
  for (let round = 1; round <= 20; round += 1) {
    for (const field of GUESS_FIELDS) {
      localStorage.removeItem(legacyRoundWineGuessFieldKey(gameId, round, field));
    }
  }
  localStorage.removeItem(`wine-guess-${gameId}-activeRound`);
}

function readRoundWineGuessFromLocalStorage(
  gameId: string,
  userId: string,
  roundNumber: number
): Partial<WineParams> {
  if (!hasLocalStorage() || !userId) return { ...EMPTY_WINE_GUESS };
  return {
    color:
      localStorage.getItem(wineGuessFieldKey(gameId, userId, roundNumber, "color")) ||
      "",
    sweetness:
      localStorage.getItem(
        wineGuessFieldKey(gameId, userId, roundNumber, "sweetness")
      ) || "",
    composition:
      localStorage.getItem(
        wineGuessFieldKey(gameId, userId, roundNumber, "composition")
      ) || "",
    country:
      localStorage.getItem(wineGuessFieldKey(gameId, userId, roundNumber, "country")) ||
      "",
    vintageYear:
      localStorage.getItem(
        wineGuessFieldKey(gameId, userId, roundNumber, "vintageYear")
      ) || "",
    alcoholContent:
      localStorage.getItem(
        wineGuessFieldKey(gameId, userId, roundNumber, "alcoholContent")
      ) || "",
    grapeVarieties: JSON.parse(
      localStorage.getItem(
        wineGuessFieldKey(gameId, userId, roundNumber, "grapeVarieties")
      ) || "[]"
    ),
    isOakAged: (() => {
      const saved = localStorage.getItem(
        wineGuessFieldKey(gameId, userId, roundNumber, "isOakAged")
      );
      if (saved === null) return null;
      return saved === "true";
    })(),
  };
}

/**
 * Черновик ответа для раунда и участника.
 * Ключи: `wine-guess-{gameId}-u{userId}-r{round}-{field}`.
 */
export function readWineGuessFromLocalStorage(
  gameId: string,
  userId: string,
  roundNumber: number
): Partial<WineParams> {
  if (!hasLocalStorage() || !userId) return { ...EMPTY_WINE_GUESS };
  return readRoundWineGuessFromLocalStorage(gameId, userId, roundNumber);
}

export function writeWineGuessToLocalStorage(
  gameId: string,
  userId: string,
  roundNumber: number,
  values: Partial<WineParams>
): void {
  if (!hasLocalStorage() || !userId) return;
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "color"),
    String(values.color ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "sweetness"),
    String(values.sweetness ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "composition"),
    String(values.composition ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "country"),
    String(values.country ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "vintageYear"),
    String(values.vintageYear ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "alcoholContent"),
    String(values.alcoholContent ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, userId, roundNumber, "grapeVarieties"),
    JSON.stringify(Array.isArray(values.grapeVarieties) ? values.grapeVarieties : [])
  );
  const oak = values.isOakAged;
  const oakKey = wineGuessFieldKey(gameId, userId, roundNumber, "isOakAged");
  if (oak === null || oak === undefined) {
    localStorage.removeItem(oakKey);
  } else {
    localStorage.setItem(oakKey, oak ? "true" : "false");
  }
}

export function clearWineGuessLocalStorage(
  gameId: string,
  userId: string,
  roundNumber: number
): void {
  if (!hasLocalStorage() || !userId) return;
  for (const field of GUESS_FIELDS) {
    localStorage.removeItem(wineGuessFieldKey(gameId, userId, roundNumber, field));
  }
}

/** Синхронизирует активный раунд в storage для конкретного участника. */
export function prepareWineGuessStorageForRound(
  gameId: string,
  userId: string,
  roundNumber: number
): void {
  if (!hasLocalStorage() || !userId) return;
  setActivePlayRoundNumber(gameId, userId, roundNumber);
}

export function dispatchWineGuessStorageChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("localStorageChange"));
}

export function isWineGuessStorageKey(
  key: string | null,
  gameId: string,
  userId: string,
  roundNumber: number
): boolean {
  if (!key || !userId) return false;
  if (key === activePlayRoundStorageKey(gameId, userId)) return true;
  if (key.startsWith(`wine-guess-${gameId}-u${userId}-r${roundNumber}-`)) {
    return true;
  }
  return false;
}
