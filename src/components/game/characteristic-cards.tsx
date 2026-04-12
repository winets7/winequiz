"use client";

import { useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { COLOR_LABELS, COLOR_ICONS, SWEETNESS_LABELS, COMPOSITION_LABELS } from "@/lib/wine-data";
import { WineParams } from "./wine-form";

/** Максимальный кегль, вписывающий текст в clientWidth × clientHeight (учёт паддингов — снаружи). */
function fitFontToBox(el: HTMLElement, minPx: number, maxPx: number): { px: number; overflows: boolean } {
  if (maxPx < minPx) maxPx = minPx;
  let lo = minPx;
  let hi = maxPx;
  let best = minPx;
  const eps = 1;

  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const ok = el.scrollHeight <= h + eps && el.scrollWidth <= w + eps;
    if (ok) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  el.style.fontSize = `${best}px`;
  const overflows =
    el.scrollHeight > el.clientHeight + eps || el.scrollWidth > el.clientWidth + eps;
  return { px: best, overflows };
}

function CharacteristicLabelFit({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const fit = () => {
      const node = ref.current;
      const wrap = node?.parentElement;
      if (!node || !wrap) return;
      const w = wrap.clientWidth;
      if (w < 6) return;

      const minPx = 7;
      const maxPx = Math.max(minPx, Math.min(22, w * 0.15));
      node.style.whiteSpace = "nowrap";
      node.style.display = "block";
      node.style.overflow = "hidden";
      node.style.textOverflow = "ellipsis";

      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        node.style.fontSize = `${mid}px`;
        if (node.scrollWidth <= w + 1) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      node.style.fontSize = `${best}px`;
    };

    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(parent);
    return () => ro.disconnect();
  }, [text]);

  return (
    <span
      ref={ref}
      className="block min-w-0 uppercase tracking-wide text-[var(--muted-foreground)]"
    >
      {text}
    </span>
  );
}

function CharacteristicValueFit({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const node = ref.current;
      if (!node) return;
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (w < 6 || h < 6) return;

      const minPx = 9;
      const maxPx = Math.max(minPx, Math.min(160, Math.min(w, h) * 0.58));
      const { overflows } = fitFontToBox(node, minPx, maxPx);
      node.style.overflow = overflows ? "auto" : "hidden";
    };

    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={ref}
      className="min-h-0 min-w-0 flex-1 overflow-hidden break-words font-bold leading-[1.12] text-[var(--foreground)] [overflow-wrap:anywhere]"
    >
      {text}
    </div>
  );
}

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
          className="flex min-h-0 min-w-0 flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl text-left hover:bg-[var(--muted)] transition-all card-shadow [container-type:size] [padding:clamp(0.5rem,3cqmin,1rem)]"
        >
          <div className="min-w-0 shrink-0 border-b border-[var(--border)] [margin-bottom:clamp(0.25rem,1.2cqmin,0.5rem)] [padding-bottom:clamp(0.25rem,1.2cqmin,0.5rem)]">
            <CharacteristicLabelFit text={card.label} />
          </div>
          <CharacteristicValueFit text={card.value} />
        </button>
      ))}
    </div>
  );
}
