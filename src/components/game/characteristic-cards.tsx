"use client";

import { useRouter } from "next/navigation";
import { COLOR_LABELS, COLOR_ICONS, SWEETNESS_LABELS, COMPOSITION_LABELS } from "@/lib/wine-data";
import { WineParams } from "./wine-form";

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

  const handleCardClick = (field: keyof WineParams, path: string) => {
    if (onValueChange) {
      // Если есть обработчик, используем его (для inline редактирования)
      return;
    }
    // Иначе переходим на страницу выбора
    router.push(`/play/${gameId}/select/${path}`);
  };

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
    {
      icon: "🎨",
      label: "Цвет вина",
      value: getColorDisplay(),
      field: "color" as keyof WineParams,
      path: "color",
    },
    {
      icon: "🍬",
      label: "Сладость",
      value: getSweetnessDisplay(),
      field: "sweetness" as keyof WineParams,
      path: "sweetness",
    },
    {
      icon: "🔀",
      label: "Состав",
      value: getCompositionDisplay(),
      field: "composition" as keyof WineParams,
      path: "composition",
    },
    {
      icon: "🍇",
      label: "Сорта винограда",
      value: getGrapeVarietiesDisplay(),
      field: "grapeVarieties" as keyof WineParams,
      path: "grape-varieties",
    },
    {
      icon: "🌍",
      label: "Страна",
      value: getCountryDisplay(),
      field: "country" as keyof WineParams,
      path: "country",
    },
    {
      icon: "📅",
      label: "Год урожая",
      value: getVintageYearDisplay(),
      field: "vintageYear" as keyof WineParams,
      path: "vintage-year",
    },
    {
      icon: "🥃",
      label: "Крепость (%)",
      value: getAlcoholContentDisplay(),
      field: "alcoholContent" as keyof WineParams,
      path: "alcohol-content",
    },
    {
      icon: "🪵",
      label: "Выдержка в бочке",
      value: getOakAgedDisplay(),
      field: "isOakAged" as keyof WineParams,
      path: "oak-aged",
    },
  ];

  return (
    <div
      className={`grid h-full min-h-[220px] grid-cols-2 grid-rows-[repeat(4,minmax(0,1fr))] gap-3 sm:gap-4 ${className}`.trim()}
    >
      {cards.map((card) => (
        <button
          key={card.field}
          type="button"
          onClick={() => handleCardClick(card.field, card.path)}
          className="flex min-h-0 min-w-0 flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 sm:p-4 text-left hover:bg-[var(--muted)] transition-all card-shadow"
        >
          <div className="mb-2 shrink-0 border-b border-[var(--border)] pb-2">
            <span className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              {card.label}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto text-sm font-bold text-[var(--foreground)] sm:text-base leading-tight">
            {card.value}
          </div>
        </button>
      ))}
    </div>
  );
}
