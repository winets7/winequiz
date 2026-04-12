"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COLOR_LABELS, COLOR_ICONS, SWEETNESS_LABELS, COMPOSITION_LABELS } from "@/lib/wine-data";
import { WineParams } from "./wine-form";

/**
 * Максимальный кегль для textEl, чтобы текст помещался в прямоугольник container
 * (учёт области под заголовком и линией — это размеры flex-области значения).
 */
function fitFontToBox(
  container: HTMLElement,
  textEl: HTMLElement,
  minPx: number,
  maxPx: number,
): { px: number; overflows: boolean } {
  if (maxPx < minPx) maxPx = minPx;
  let lo = minPx;
  let hi = maxPx;
  let best = minPx;
  const eps = 1;
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    textEl.style.fontSize = `${mid}px`;
    const ok =
      textEl.scrollHeight <= ch + eps && textEl.scrollWidth <= cw + eps;
    if (ok) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  textEl.style.fontSize = `${best}px`;
  const overflows =
    textEl.scrollHeight > ch + eps || textEl.scrollWidth > cw + eps;
  return { px: best, overflows };
}

/** Самая длинная подпись — по ширине ячейки под неё вычисляется общий кегль для всех заголовков. */
const REFERENCE_LABEL_TEXT = "Выдержка в бочке";

function fitFontToLabelWidth(probe: HTMLElement, wrapWidth: number): number {
  const minPx = 7;
  const maxPx = Math.max(minPx, Math.min(56, wrapWidth * 0.28));
  let lo = minPx;
  let hi = maxPx;
  let best = minPx;
  probe.style.whiteSpace = "nowrap";
  probe.style.display = "block";

  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    probe.style.fontSize = `${mid}px`;
    if (probe.scrollWidth <= wrapWidth + 1) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  probe.style.fontSize = `${best}px`;
  return best;
}

function CharacteristicValueFit({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fit = () => {
      const c = containerRef.current;
      const node = textRef.current;
      if (!c || !node) return;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (w < 6 || h < 6) return;

      const minPx = 9;
      const maxPx = Math.max(minPx, Math.min(160, Math.min(w, h) * 0.58));
      const { overflows } = fitFontToBox(c, node, minPx, maxPx);
      node.style.overflow = overflows ? "auto" : "hidden";
    };

    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden"
    >
      <div
        ref={textRef}
        className="w-full min-w-0 text-center break-words font-bold leading-[1.12] text-[var(--foreground)] [overflow-wrap:anywhere]"
      >
        {text}
      </div>
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
  const labelMeasureWrapRef = useRef<HTMLDivElement>(null);
  const labelProbeRef = useRef<HTMLSpanElement>(null);
  const [unifiedLabelFontPx, setUnifiedLabelFontPx] = useState(11);

  useLayoutEffect(() => {
    const wrap = labelMeasureWrapRef.current;
    const probe = labelProbeRef.current;
    if (!wrap || !probe) return;

    const fit = () => {
      const w = wrap.clientWidth;
      if (w < 6) return;
      const px = fitFontToLabelWidth(probe, w);
      setUnifiedLabelFontPx(px);
    };

    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

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
      label: REFERENCE_LABEL_TEXT,
      value: getOakAgedDisplay(),
      field: "isOakAged" as keyof WineParams,
      path: "oak-aged",
    },
  ];

  return (
    <div
      className={`grid h-full min-h-[220px] grid-cols-2 grid-rows-[repeat(4,minmax(0,1fr))] gap-3 sm:gap-4 ${className}`.trim()}
    >
      {cards.map((card, index) => (
        <button
          key={card.field}
          type="button"
          onClick={() => handleCardClick(card.field, card.path)}
          className="flex min-h-0 min-w-0 flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl text-left hover:bg-[var(--muted)] transition-all card-shadow [container-type:size] [padding:clamp(0.5rem,3cqmin,1rem)]"
        >
          <div
            ref={index === 0 ? labelMeasureWrapRef : undefined}
            className="relative min-w-0 shrink-0 border-b border-[var(--border)] [margin-bottom:clamp(0.25rem,1.2cqmin,0.5rem)] [padding-bottom:clamp(0.25rem,1.2cqmin,0.5rem)]"
          >
            {index === 0 && (
              <span
                ref={labelProbeRef}
                className="pointer-events-none absolute left-0 top-0 block w-full select-none whitespace-nowrap uppercase tracking-wide text-[var(--muted-foreground)] opacity-0"
                aria-hidden
              >
                {REFERENCE_LABEL_TEXT}
              </span>
            )}
            <span
              className="relative z-[1] block min-w-0 whitespace-nowrap uppercase tracking-wide text-[var(--muted-foreground)]"
              style={{ fontSize: `${unifiedLabelFontPx}px` }}
            >
              {card.label}
            </span>
          </div>
          <CharacteristicValueFit text={card.value} />
        </button>
      ))}
    </div>
  );
}
