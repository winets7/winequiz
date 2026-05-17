"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { COLOR_LABELS, COLOR_ICONS, SWEETNESS_LABELS, COMPOSITION_LABELS } from "@/lib/wine-data";
import { WineParams } from "./wine-form";
import { CountryValueBlock } from "./country-value-block";

/** Карточка ответа на /play — см. `.cursor/rules/wine-quiz-active-game-cards.mdc` */
const WINE_QUIZ_ANSWER_CARD =
  "flex min-h-0 min-w-0 flex-col rounded-xl border-4 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] text-left shadow-md transition-colors card-shadow [container-type:size] [padding:clamp(0.5rem,3cqmin,1rem)] hover:border-[var(--wine-quiz-active-game-card-border-hover)] hover:bg-[var(--wine-quiz-active-game-card-bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

interface CharacteristicCardsProps {
  gameId: string;
  values: Partial<WineParams>;
  onValueChange?: (field: keyof WineParams, value: unknown) => void;
  /** Доп. классы корневого контейнера (например `h-full` для сетки 2×4 на всю высоту родителя). */
  className?: string;
}

export function CharacteristicCards({
  gameId,
  values,
  onValueChange,
  className = "",
}: CharacteristicCardsProps) {
  const router = useRouter();

  const cards = useMemo(() => {
    const colorDisplay = !values.color
      ? "Не выбрано"
      : `${COLOR_ICONS[values.color] || ""} ${COLOR_LABELS[values.color] || values.color}`.trim();
    const sweetnessDisplay = !values.sweetness
      ? "Не выбрано"
      : SWEETNESS_LABELS[values.sweetness] || values.sweetness;
    const compositionDisplay = !values.composition
      ? "Не выбрано"
      : COMPOSITION_LABELS[values.composition] || values.composition;
    const grapeDisplay =
      !values.grapeVarieties || values.grapeVarieties.length === 0
        ? "Не выбрано"
        : values.grapeVarieties.join(", ");
    const countryDisplay = !values.country ? "Не выбрано" : values.country;
    const vintageDisplay = !values.vintageYear ? "Не выбрано" : values.vintageYear;
    const alcoholDisplay = !values.alcoholContent ? "Не выбрано" : `${values.alcoholContent}%`;
    const oakDisplay =
      values.isOakAged === null || values.isOakAged === undefined
        ? "Не выбрано"
        : values.isOakAged
          ? "Да"
          : "Нет";

    return [
      { icon: "🎨", label: "Цвет вина", value: colorDisplay, field: "color" as const, path: "color" },
      { icon: "🍬", label: "Сладость", value: sweetnessDisplay, field: "sweetness" as const, path: "sweetness" },
      { icon: "🔀", label: "Состав", value: compositionDisplay, field: "composition" as const, path: "composition" },
      {
        icon: "🍇",
        label: "Сорта винограда",
        value: grapeDisplay,
        field: "grapeVarieties" as const,
        path: "grape-varieties",
      },
      { icon: "🌍", label: "Страна", value: countryDisplay, field: "country" as const, path: "country" },
      {
        icon: "📅",
        label: "Год урожая",
        value: vintageDisplay,
        field: "vintageYear" as const,
        path: "vintage-year",
      },
      {
        icon: "🥃",
        label: "Крепость (%)",
        value: alcoholDisplay,
        field: "alcoholContent" as const,
        path: "alcohol-content",
      },
      {
        icon: "🪵",
        label: "Выдержка в бочке",
        value: oakDisplay,
        field: "isOakAged" as const,
        path: "oak-aged",
      },
    ];
  }, [values]);

  const handleCardClick = (field: keyof WineParams, path: string) => {
    if (onValueChange) {
      return;
    }
    router.push(`/play/${gameId}/select/${path}`);
  };

  return (
    <div className={`relative min-h-[220px] ${className}`.trim()}>
      <div className="grid h-full min-h-[220px] grid-cols-2 grid-rows-[repeat(4,minmax(0,1fr))] gap-3 sm:gap-4">
        {cards.map((card) => (
          <button
            key={card.field}
            type="button"
            onClick={() => handleCardClick(card.field, card.path)}
            className={WINE_QUIZ_ANSWER_CARD}
          >
            <div className="mb-2 shrink-0 border-b border-[var(--wine-quiz-active-game-card-border)] pb-2">
              <span className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                {card.label}
              </span>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {card.field === "country" && values.country ? (
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
    </div>
  );
}
