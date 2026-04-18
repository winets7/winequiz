"use client";

import { useRouter } from "next/navigation";
import { COLOR_LABELS, COLOR_ICONS, SWEETNESS_LABELS, COMPOSITION_LABELS } from "@/lib/wine-data";
import type { WineParams } from "./wine-form";
import { CountryValueBlock } from "./country-value-block";

interface HostRoundCharacteristicCardsProps {
  gameId: string;
  roundNumber: number;
  values: Partial<WineParams>;
  disabled?: boolean;
}

export function HostRoundCharacteristicCards({
  gameId,
  roundNumber,
  values,
  disabled = false,
}: HostRoundCharacteristicCardsProps) {
  const router = useRouter();

  const basePath = `/lobby/${gameId}/round/${roundNumber}/select`;

  const getColorDisplay = () => {
    if (!values.color) return "Не выбрано";
    return `${COLOR_ICONS[values.color] || ""} ${COLOR_LABELS[values.color] || values.color}`;
  };

  const getSweetnessDisplay = () => {
    if (!values.sweetness) return "Не выбрано";
    return SWEETNESS_LABELS[values.sweetness] || values.sweetness;
  };

  const getCompositionDisplay = () => {
    if (!values.composition) return "Не выбрано";
    return COMPOSITION_LABELS[values.composition] || values.composition;
  };

  const getGrapeVarietiesDisplay = () => {
    if (!values.grapeVarieties || values.grapeVarieties.length === 0) return "Не выбрано";
    return values.grapeVarieties.join(", ");
  };

  const getCountryDisplay = () => {
    if (!values.country) return "Не выбрано";
    return values.country;
  };

  const getVintageYearDisplay = () => {
    if (!values.vintageYear) return "Не выбрано";
    return values.vintageYear;
  };

  const getAlcoholContentDisplay = () => {
    if (!values.alcoholContent) return "Не выбрано";
    return `${values.alcoholContent}%`;
  };

  const getOakAgedDisplay = () => {
    if (values.isOakAged === null || values.isOakAged === undefined) return "Не выбрано";
    return values.isOakAged ? "Да" : "Нет";
  };

  const cards = [
    { icon: "🎨", label: "Цвет вина", value: getColorDisplay(), path: "color" },
    { icon: "🍬", label: "Сладость", value: getSweetnessDisplay(), path: "sweetness" },
    { icon: "🔀", label: "Состав", value: getCompositionDisplay(), path: "composition" },
    { icon: "🍇", label: "Сорта винограда", value: getGrapeVarietiesDisplay(), path: "grape-varieties" },
    { icon: "🌍", label: "Страна", value: getCountryDisplay(), path: "country" },
    { icon: "📅", label: "Год урожая", value: getVintageYearDisplay(), path: "vintage-year" },
    { icon: "🥃", label: "Крепость (%)", value: getAlcoholContentDisplay(), path: "alcohol-content" },
    { icon: "🪵", label: "Выдержка в бочке", value: getOakAgedDisplay(), path: "oak-aged" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <button
          key={card.path}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && router.push(`${basePath}/${card.path}`)}
          className={`flex min-h-[140px] min-w-0 flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-left transition-all card-shadow [container-type:size] ${
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-[var(--muted)]"
          }`}
        >
          <div className="mb-2 shrink-0 border-b border-[var(--border)] pb-2">
            <span className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              {card.label}
            </span>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {card.path === "country" && values.country ? (
              <CountryValueBlock countryName={values.country} />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center text-center text-base font-bold text-[var(--foreground)]">
                {card.value}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
