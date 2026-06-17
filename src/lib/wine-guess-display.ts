import {
  COLOR_LABELS,
  COLOR_ICONS,
  SWEETNESS_LABELS,
  COMPOSITION_LABELS,
} from "@/lib/wine-data";

export interface WineGuessFields {
  grapeVarieties: string[];
  sweetness: string | null;
  vintageYear: number | null;
  country: string | null;
  alcoholContent: number | null;
  isOakAged: boolean | null;
  color: string | null;
  composition: string | null;
}

export type WineGuessFieldKey =
  | "color"
  | "sweetness"
  | "composition"
  | "grapeVarieties"
  | "country"
  | "vintageYear"
  | "alcoholContent"
  | "isOakAged";

export interface WineGuessDisplayValues {
  color: string;
  sweetness: string;
  composition: string;
  grapeVarieties: string;
  country: string;
  vintageYear: string;
  alcoholContent: string;
  isOakAged: string;
}

export const WINE_GUESS_FIELD_ORDER: Array<{
  key: WineGuessFieldKey;
  label: string;
}> = [
  { key: "color", label: "Цвет вина" },
  { key: "sweetness", label: "Сладость" },
  { key: "composition", label: "Состав" },
  { key: "grapeVarieties", label: "Сорта винограда" },
  { key: "country", label: "Страна" },
  { key: "vintageYear", label: "Год урожая" },
  { key: "alcoholContent", label: "Крепость (%)" },
  { key: "isOakAged", label: "Выдержка в бочке" },
];

function normalizeGrapes(grapes: string[]): string[] {
  return [...new Set(grapes.map((g) => g.toLowerCase().trim()).filter(Boolean))].sort();
}

export function areGrapeVarietiesFullMatch(
  guess: string[],
  correct: string[]
): boolean {
  const g = normalizeGrapes(guess);
  const c = normalizeGrapes(correct);
  if (g.length !== c.length) return false;
  return g.every((value, index) => value === c[index]);
}

export function formatWineGuessForDisplay(
  answer: WineGuessFields
): WineGuessDisplayValues {
  return {
    color: answer.color
      ? `${COLOR_ICONS[answer.color] || ""} ${COLOR_LABELS[answer.color] || answer.color}`.trim()
      : "—",
    sweetness: answer.sweetness
      ? SWEETNESS_LABELS[answer.sweetness] || answer.sweetness
      : "—",
    composition: answer.composition
      ? COMPOSITION_LABELS[answer.composition] || answer.composition
      : "—",
    grapeVarieties:
      answer.grapeVarieties.length > 0 ? answer.grapeVarieties.join(", ") : "—",
    country: answer.country || "—",
    vintageYear: answer.vintageYear?.toString() || "—",
    alcoholContent:
      answer.alcoholContent != null ? `${answer.alcoholContent}%` : "—",
    isOakAged:
      answer.isOakAged === true
        ? "Да"
        : answer.isOakAged === false
          ? "Нет"
          : "—",
  };
}

export function isWineGuessFieldMatch(
  key: WineGuessFieldKey,
  guess: WineGuessFields,
  correct: WineGuessFields
): boolean {
  switch (key) {
    case "color":
      return guess.color === correct.color;
    case "sweetness":
      return guess.sweetness === correct.sweetness;
    case "composition":
      return guess.composition === correct.composition;
    case "isOakAged":
      return guess.isOakAged === correct.isOakAged;
    case "country":
      return (
        (guess.country?.toLowerCase().trim() || "") ===
        (correct.country?.toLowerCase().trim() || "")
      );
    case "vintageYear":
      return guess.vintageYear === correct.vintageYear;
    case "alcoholContent":
      return (
        guess.alcoholContent != null &&
        correct.alcoholContent != null &&
        Math.abs(guess.alcoholContent - correct.alcoholContent) <= 0.5
      );
    case "grapeVarieties":
      return areGrapeVarietiesFullMatch(
        guess.grapeVarieties,
        correct.grapeVarieties
      );
    default:
      return false;
  }
}
