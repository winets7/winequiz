"use client";

import { useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { COLOR_LABELS, COLOR_ICONS, SWEETNESS_LABELS, COMPOSITION_LABELS } from "@/lib/wine-data";
import { WineParams } from "./wine-form";
import { CountryValueBlock } from "./country-value-block";

/** Слова для замера ширины: пробелы, запятые, точки с запятой — границы; без разрыва внутри токена. */
function extractWordsFromValueStrings(strings: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of strings) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[\s,;]+/).filter(Boolean);
    for (const p of parts) {
      const w = p.trim();
      if (!w || seen.has(w)) continue;
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

/**
 * Один кегль для всех значений: максимальный размер, при котором каждое слово
 * в одну строку не шире maxWidth (ширина области значения в ячейке).
 */
function fitMaxFontAllWordsFitWidth(
  words: string[],
  maxWidth: number,
  probe: HTMLElement,
  minPx: number,
  maxPx: number,
): number {
  if (words.length === 0) return minPx;
  if (maxPx < minPx) maxPx = minPx;

  const cs = getComputedStyle(probe);
  probe.style.whiteSpace = "nowrap";
  probe.style.fontFamily = cs.fontFamily;
  probe.style.fontWeight = cs.fontWeight;
  probe.style.letterSpacing = cs.letterSpacing;

  let lo = minPx;
  let hi = maxPx;
  let best = minPx;

  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    let ok = true;
    for (const word of words) {
      probe.textContent = word;
      probe.style.fontSize = `${mid}px`;
      if (probe.offsetWidth > maxWidth + 1) {
        ok = false;
        break;
      }
    }
    if (ok) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  probe.textContent = "";
  return best;
}

/** Иллюстрации заголовков карточек — см. `.cursor/rules/wine-quiz-wineparam-assets.mdc` */
const WINE_PARAM_HEADER_IMAGE: Record<string, string> = {
  color: "/ui/wineparam/colorwine@2x.png",
  sweetness: "/ui/wineparam/sweetwine@2x.png",
  composition: "/ui/wineparam/sostavwine@2x.png",
  "grape-varieties": "/ui/wineparam/sortwine@2x.png",
  country: "/ui/wineparam/stranawine@2x.png",
  "vintage-year": "/ui/wineparam/yearwine@2x.png",
  "alcohol-content": "/ui/wineparam/strongwine@2x.png",
  "oak-aged": "/ui/wineparam/agedwine@2x.png",
};

function CharacteristicValueBlock({
  text,
  fontSizePx,
  widthMeasureRef,
}: {
  text: string;
  fontSizePx: number;
  widthMeasureRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (widthMeasureRef) widthMeasureRef.current = el;
  };

  useLayoutEffect(() => {
    const c = containerRef.current;
    const t = textRef.current;
    if (!c || !t) return;
    const eps = 1;
    const overY = t.scrollHeight > c.clientHeight + eps;
    const overX = t.scrollWidth > c.clientWidth + eps;
    t.style.overflowY = overY ? "auto" : "hidden";
    t.style.overflowX = overX ? "auto" : "hidden";
  }, [text, fontSizePx]);

  return (
    <div
      ref={setContainerRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden"
    >
      <div
        ref={textRef}
        className="max-h-full w-full min-w-0 text-center font-bold leading-[1.12] text-[var(--foreground)] [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
        style={{ fontSize: `${fontSizePx}px` }}
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
  const valueWidthRef = useRef<HTMLDivElement>(null);
  const valueFontProbeRef = useRef<HTMLSpanElement>(null);
  const [unifiedValueFontPx, setUnifiedValueFontPx] = useState(12);

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
      {
        label: "Цвет вина",
        headerSrc: WINE_PARAM_HEADER_IMAGE.color,
        value: colorDisplay,
        field: "color" as const,
        path: "color",
      },
      {
        label: "Сладость",
        headerSrc: WINE_PARAM_HEADER_IMAGE.sweetness,
        value: sweetnessDisplay,
        field: "sweetness" as const,
        path: "sweetness",
      },
      {
        label: "Состав",
        headerSrc: WINE_PARAM_HEADER_IMAGE.composition,
        value: compositionDisplay,
        field: "composition" as const,
        path: "composition",
      },
      {
        label: "Сорта винограда",
        headerSrc: WINE_PARAM_HEADER_IMAGE["grape-varieties"],
        value: grapeDisplay,
        field: "grapeVarieties" as const,
        path: "grape-varieties",
      },
      {
        label: "Страна",
        headerSrc: WINE_PARAM_HEADER_IMAGE.country,
        value: countryDisplay,
        field: "country" as const,
        path: "country",
      },
      {
        label: "Год урожая",
        headerSrc: WINE_PARAM_HEADER_IMAGE["vintage-year"],
        value: vintageDisplay,
        field: "vintageYear" as const,
        path: "vintage-year",
      },
      {
        label: "Крепость (%)",
        headerSrc: WINE_PARAM_HEADER_IMAGE["alcohol-content"],
        value: alcoholDisplay,
        field: "alcoholContent" as const,
        path: "alcohol-content",
      },
      {
        label: "Выдержка в бочке",
        headerSrc: WINE_PARAM_HEADER_IMAGE["oak-aged"],
        value: oakDisplay,
        field: "isOakAged" as const,
        path: "oak-aged",
      },
    ];
  }, [values]);

  useLayoutEffect(() => {
    const wrap = valueWidthRef.current;
    const probe = valueFontProbeRef.current;
    if (!wrap || !probe) return;

    const valueStrings = cards.map((c) =>
      c.field === "country" && values.country ? "" : c.value,
    );
    const words = extractWordsFromValueStrings(valueStrings);

    const fit = () => {
      const w = wrap.clientWidth;
      if (w < 6) return;
      const minPx = 9;
      // На десктопе не даем значению раздуваться до размеров заголовка.
      const maxPx = Math.max(minPx, Math.min(44, w * 0.28));
      const px =
        words.length === 0
          ? 12
          : fitMaxFontAllWordsFitWidth(words, w, probe, minPx, maxPx);
      setUnifiedValueFontPx(px);
    };

    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [cards, values.country]);

  const handleCardClick = (field: keyof WineParams, path: string) => {
    if (onValueChange) {
      // Если есть обработчик, используем его (для inline редактирования)
      return;
    }
    // Иначе переходим на страницу выбора
    router.push(`/play/${gameId}/select/${path}`);
  };

  return (
    <div className={`relative min-h-[220px] ${className}`.trim()}>
      <span
        ref={valueFontProbeRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] whitespace-nowrap font-bold text-[var(--foreground)]"
      />
      <div className="grid h-full min-h-[220px] grid-cols-2 grid-rows-[repeat(4,minmax(0,1fr))] gap-3 sm:gap-4">
      {cards.map((card, index) => (
        <button
          key={card.field}
          type="button"
          onClick={() => handleCardClick(card.field, card.path)}
          className="flex min-h-0 min-w-0 flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl text-left hover:bg-[var(--muted)] transition-all card-shadow [container-type:size] [padding:clamp(0.5rem,3cqmin,1rem)]"
        >
          <div className="relative flex min-h-0 min-w-0 shrink-0 items-center justify-center border-b border-[var(--border)] [margin-bottom:clamp(0.25rem,1.2cqmin,0.5rem)] [padding-bottom:clamp(0.25rem,1.2cqmin,0.5rem)]">
            <img
              src={card.headerSrc}
              alt={card.label}
              draggable={false}
              className="pointer-events-none h-[clamp(1.75rem,12cqmin,3.25rem)] w-auto max-w-full select-none object-contain object-center"
            />
          </div>
          {card.field === "country" && values.country ? (
            <CountryValueBlock countryName={values.country} />
          ) : (
            <CharacteristicValueBlock
              text={card.value}
              fontSizePx={unifiedValueFontPx}
              widthMeasureRef={index === 0 ? valueWidthRef : undefined}
            />
          )}
        </button>
      ))}
      </div>
    </div>
  );
}
