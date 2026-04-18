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
  const labelMeasureWrapRef = useRef<HTMLDivElement>(null);
  const labelProbeRef = useRef<HTMLSpanElement>(null);
  const valueWidthRef = useRef<HTMLDivElement>(null);
  const valueFontProbeRef = useRef<HTMLSpanElement>(null);
  const [unifiedLabelFontPx, setUnifiedLabelFontPx] = useState(11);
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
        label: REFERENCE_LABEL_TEXT,
        value: oakDisplay,
        field: "isOakAged" as const,
        path: "oak-aged",
      },
    ];
  }, [values]);

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
      const maxPx = Math.max(minPx, Math.min(160, w));
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
