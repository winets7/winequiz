import type { WineParams } from "@/components/game/wine-form";

const DRAFT_PREFIX = "vintaste-lobby-round-draft";

export function getDraftKey(gameId: string, roundNumber: number): string {
  return `${DRAFT_PREFIX}-${gameId}-${roundNumber}`;
}

export function getDraft(gameId: string, roundNumber: number): WineParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getDraftKey(gameId, roundNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WineParams;
    return normalizeDraft(parsed);
  } catch {
    return null;
  }
}

export function setDraft(gameId: string, roundNumber: number, draft: WineParams): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getDraftKey(gameId, roundNumber), JSON.stringify(draft));
}

export function clearDraft(gameId: string, roundNumber: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getDraftKey(gameId, roundNumber));
}

const emptyParams: WineParams = {
  grapeVarieties: [],
  sweetness: "",
  vintageYear: "",
  country: "",
  alcoholContent: "",
  isOakAged: null,
  color: "",
  composition: "",
};

function normalizeDraft(parsed: Partial<WineParams>): WineParams {
  return {
    ...emptyParams,
    ...parsed,
    grapeVarieties: Array.isArray(parsed.grapeVarieties) ? parsed.grapeVarieties : [],
  };
}

/** Данные раунда с API (RoundData) → WineParams для черновика */
export interface RoundDataForDraft {
  color: string | null;
  sweetness: string | null;
  grapeVarieties?: string[];
  country: string | null;
  vintageYear: number | null;
  alcoholContent: number | null;
  isOakAged: boolean | null;
  composition: string | null;
}

export function roundToWineParams(round: RoundDataForDraft | null | undefined): WineParams {
  if (!round) return { ...emptyParams };
  return {
    color: round.color ?? "",
    sweetness: round.sweetness ?? "",
    grapeVarieties: round.grapeVarieties ?? [],
    country: round.country ?? "",
    vintageYear: round.vintageYear != null ? String(round.vintageYear) : "",
    alcoholContent: round.alcoholContent != null ? String(round.alcoholContent) : "",
    isOakAged: round.isOakAged ?? null,
    composition: round.composition ?? "",
  };
}
