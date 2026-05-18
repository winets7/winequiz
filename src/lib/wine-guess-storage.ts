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

/** Ключи до фикса (без номера раунда) — не должны подставляться во 2+ раунд. */
function legacyWineGuessFieldKey(gameId: string, field: string): string {
  return `wine-guess-${gameId}-${field}`;
}

function isLegacyWineGuessStorageKey(key: string, gameId: string): boolean {
  const prefix = `wine-guess-${gameId}-`;
  if (!key.startsWith(prefix) || key === activePlayRoundStorageKey(gameId)) {
    return false;
  }
  const suffix = key.slice(prefix.length);
  if (/^r\d+-/.test(suffix)) return false;
  return (GUESS_FIELDS as readonly string[]).includes(suffix);
}

export function activePlayRoundStorageKey(gameId: string): string {
  return `wine-guess-${gameId}-activeRound`;
}

export function getActivePlayRoundNumber(gameId: string): number {
  if (!hasLocalStorage()) return 1;
  const stored = localStorage.getItem(activePlayRoundStorageKey(gameId));
  const n = stored ? parseInt(stored, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function setActivePlayRoundNumber(gameId: string, roundNumber: number): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(activePlayRoundStorageKey(gameId), String(roundNumber));
}

export function wineGuessFieldKey(
  gameId: string,
  roundNumber: number,
  field: string
): string {
  return `wine-guess-${gameId}-r${roundNumber}-${field}`;
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

/** Удаляет устаревшие ключи `wine-guess-{gameId}-{field}` (общие на всю игру). */
export function purgeLegacyWineGuessKeys(gameId: string): void {
  if (!hasLocalStorage()) return;
  for (const field of GUESS_FIELDS) {
    localStorage.removeItem(legacyWineGuessFieldKey(gameId, field));
  }
}

function readLegacyWineGuessFromLocalStorage(gameId: string): Partial<WineParams> {
  if (!hasLocalStorage()) return { ...EMPTY_WINE_GUESS };
  return {
    color: localStorage.getItem(legacyWineGuessFieldKey(gameId, "color")) || "",
    sweetness: localStorage.getItem(legacyWineGuessFieldKey(gameId, "sweetness")) || "",
    composition: localStorage.getItem(legacyWineGuessFieldKey(gameId, "composition")) || "",
    country: localStorage.getItem(legacyWineGuessFieldKey(gameId, "country")) || "",
    vintageYear: localStorage.getItem(legacyWineGuessFieldKey(gameId, "vintageYear")) || "",
    alcoholContent: localStorage.getItem(legacyWineGuessFieldKey(gameId, "alcoholContent")) || "",
    grapeVarieties: JSON.parse(
      localStorage.getItem(legacyWineGuessFieldKey(gameId, "grapeVarieties")) || "[]"
    ),
    isOakAged: (() => {
      const saved = localStorage.getItem(legacyWineGuessFieldKey(gameId, "isOakAged"));
      if (saved === null) return null;
      return saved === "true";
    })(),
  };
}

function readRoundWineGuessFromLocalStorage(
  gameId: string,
  roundNumber: number
): Partial<WineParams> {
  if (!hasLocalStorage()) return { ...EMPTY_WINE_GUESS };
  return {
    color: localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "color")) || "",
    sweetness:
      localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "sweetness")) || "",
    composition:
      localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "composition")) || "",
    country: localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "country")) || "",
    vintageYear:
      localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "vintageYear")) || "",
    alcoholContent:
      localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "alcoholContent")) || "",
    grapeVarieties: JSON.parse(
      localStorage.getItem(wineGuessFieldKey(gameId, roundNumber, "grapeVarieties")) ||
        "[]"
    ),
    isOakAged: (() => {
      const saved = localStorage.getItem(
        wineGuessFieldKey(gameId, roundNumber, "isOakAged")
      );
      if (saved === null) return null;
      return saved === "true";
    })(),
  };
}

/**
 * Черновик ответа для раунда. Ключи: `wine-guess-{gameId}-r{round}-{field}`.
 * Устаревшие ключи без раунда переносятся только в раунд 1; для раунда 2+ — удаляются.
 */
export function readWineGuessFromLocalStorage(
  gameId: string,
  roundNumber: number
): Partial<WineParams> {
  if (!hasLocalStorage()) return { ...EMPTY_WINE_GUESS };

  if (roundNumber > 1) {
    purgeLegacyWineGuessKeys(gameId);
  }

  const fromRound = readRoundWineGuessFromLocalStorage(gameId, roundNumber);
  if (!isWineGuessDraftEmpty(fromRound)) {
    return fromRound;
  }

  if (roundNumber === 1) {
    const legacy = readLegacyWineGuessFromLocalStorage(gameId);
    purgeLegacyWineGuessKeys(gameId);
    if (!isWineGuessDraftEmpty(legacy)) {
      writeWineGuessToLocalStorage(gameId, 1, legacy);
      return legacy;
    }
  }

  return fromRound;
}

export function writeWineGuessToLocalStorage(
  gameId: string,
  roundNumber: number,
  values: Partial<WineParams>
): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "color"),
    String(values.color ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "sweetness"),
    String(values.sweetness ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "composition"),
    String(values.composition ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "country"),
    String(values.country ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "vintageYear"),
    String(values.vintageYear ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "alcoholContent"),
    String(values.alcoholContent ?? "")
  );
  localStorage.setItem(
    wineGuessFieldKey(gameId, roundNumber, "grapeVarieties"),
    JSON.stringify(Array.isArray(values.grapeVarieties) ? values.grapeVarieties : [])
  );
  const oak = values.isOakAged;
  const oakKey = wineGuessFieldKey(gameId, roundNumber, "isOakAged");
  if (oak === null || oak === undefined) {
    localStorage.removeItem(oakKey);
  } else {
    localStorage.setItem(oakKey, oak ? "true" : "false");
  }
}

export function clearWineGuessLocalStorage(gameId: string, roundNumber: number): void {
  if (!hasLocalStorage()) return;
  for (const field of GUESS_FIELDS) {
    localStorage.removeItem(wineGuessFieldKey(gameId, roundNumber, field));
  }
}

/** Синхронизирует активный раунд в storage (все клиенты: браузер, телефон, планшет, WebView). */
export function prepareWineGuessStorageForRound(
  gameId: string,
  roundNumber: number
): void {
  if (!hasLocalStorage()) return;
  setActivePlayRoundNumber(gameId, roundNumber);
  if (roundNumber > 1) {
    purgeLegacyWineGuessKeys(gameId);
  }
}

export function dispatchWineGuessStorageChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("localStorageChange"));
}

export function isWineGuessStorageKey(
  key: string | null,
  gameId: string,
  roundNumber: number
): boolean {
  if (!key) return false;
  if (key === activePlayRoundStorageKey(gameId)) return true;
  if (key.startsWith(`wine-guess-${gameId}-r${roundNumber}-`)) return true;
  if (roundNumber === 1 && isLegacyWineGuessStorageKey(key, gameId)) return true;
  return false;
}
