"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  COLOR_LABELS,
  COLOR_ICONS,
  SWEETNESS_LABELS,
  COMPOSITION_LABELS,
} from "@/lib/wine-data";
import type { WineParams } from "./wine-form";
import { CountryValueBlock } from "./country-value-block";

interface HostRoundCharacteristicCardsProps {
  gameId: string;
  roundNumber: number;
  values: Partial<WineParams>;
  disabled?: boolean;
  /** Доп. классы корневого контейнера (например `h-full` для сетки 2×4). */
  className?: string;
}

export function HostRoundCharacteristicCards({
  gameId,
  roundNumber,
  values,
  disabled = false,
  className = "",
}: HostRoundCharacteristicCardsProps) {
  const router = useRouter();
  const basePath = `/lobby/${gameId}/round/${roundNumber}/select`;

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
      { label: "Цвет вина", value: colorDisplay, path: "color" },
      { label: "Сладость", value: sweetnessDisplay, path: "sweetness" },
      { label: "Состав", value: compositionDisplay, path: "composition" },
      { label: "Сорта винограда", value: grapeDisplay, path: "grape-varieties" },
      { label: "Страна", value: countryDisplay, path: "country" },
      { label: "Год урожая", value: vintageDisplay, path: "vintage-year" },
      {
        label: "Крепость (%)",
        value: alcoholDisplay,
        path: "alcohol-content",
      },
      { label: "Выдержка в бочке", value: oakDisplay, path: "oak-aged" },
    ];
  }, [values]);

  return (
    <div className={`wine-quiz-answer-cards ${className}`.trim()}>
      <div className="wine-quiz-answer-cards__grid">
        {cards.map((card) => (
          <button
            key={card.path}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && router.push(`${basePath}/${card.path}`)}
            className={`wine-quiz-answer-card card-shadow${
              disabled ? " opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <div className="wine-quiz-answer-card__header">
              <span className="wine-quiz-answer-card__label">{card.label}</span>
            </div>
            <div className="wine-quiz-answer-card__value-body">
              {card.path === "country" && values.country ? (
                <CountryValueBlock
                  countryName={values.country}
                  typography="play-answer-card"
                />
              ) : (
                <div className="wine-quiz-answer-card__value">{card.value}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
