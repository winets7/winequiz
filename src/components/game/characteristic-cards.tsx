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

/** Фон карточки = иллюстрация параметра на всю ячейку — см. `.cursor/rules/wine-quiz-wineparam-assets.mdc` */
const WINE_PARAM_CARD_BG: Record<string, string> = {
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
  overlay = false,
}: {
  text: string;
  fontSizePx: number;
  widthMeasureRef?: MutableRefObject<HTMLDivElement | null>;
  /** Текст поверх фото-подложки — усиленная тень для читаемости */
  overlay?: boolean;
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
        className={`max-h-full w-full min-w-0 text-center font-bold leading-[1.12] [hyphens:none] [overflow-wrap:normal] [word-break:normal] ${
          overlay
            ? "text-[var(--foreground)] [text-shadow:0_0_10px_rgba(255,255,255,1),0_2px_8px_rgba(0,0,0,0.75)]"
            : "text-[var(--foreground)]"
        }`}
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
        backgroundSrc: WINE_PARAM_CARD_BG.color,
        value: colorDisplay,
        field: "color" as const,
        path: "color",
      },
      {
        label: "Сладость",
        backgroundSrc: WINE_PARAM_CARD_BG.sweetness,
        value: sweetnessDisplay,
        field: "sweetness" as const,
        path: "sweetness",
      },
      {
        label: "Состав",
        backgroundSrc: WINE_PARAM_CARD_BG.composition,
        value: compositionDisplay,
        field: "composition" as const,
        path: "composition",
      },
      {
        label: "Сорта винограда",
        backgroundSrc: WINE_PARAM_CARD_BG["grape-varieties"],
        value: grapeDisplay,
        field: "grapeVarieties" as const,
        path: "grape-varieties",
      },
      {
        label: "Страна",
        backgroundSrc: WINE_PARAM_CARD_BG.country,
        value: countryDisplay,
        field: "country" as const,
        path: "country",
      },
      {
        label: "Год урожая",
        backgroundSrc: WINE_PARAM_CARD_BG["vintage-year"],
        value: vintageDisplay,
        field: "vintageYear" as const,
        path: "vintage-year",
      },
      {
        label: "Крепость (%)",
        backgroundSrc: WINE_PARAM_CARD_BG["alcohol-content"],
        value: alcoholDisplay,
        field: "alcoholContent" as const,
        path: "alcohol-content",
      },
      {
        label: "Выдержка в бочке",
        backgroundSrc: WINE_PARAM_CARD_BG["oak-aged"],
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
          className="group relative flex min-h-0 min-w-0 overflow-hidden rounded-xl text-left ring-1 ring-black/15 transition-all card-shadow [container-type:size] hover:ring-2 hover:ring-[var(--primary)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label={card.label}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-cover bg-top bg-no-repeat transition-[filter] duration-200 group-hover:brightness-105"
            style={{ backgroundImage: `url(${card.backgroundSrc})` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/35"
          />
          <div
            className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center [padding:clamp(0.35rem,2.8cqmin,0.85rem)]"
          >
            {card.field === "country" && values.country ? (
              <div className="flex min-h-0 w-full flex-1 flex-col items-stretch justify-center [&_img]:drop-shadow-md [&_div:last-child]:[text-shadow:0_0_10px_rgba(255,255,255,1),0_2px_8px_rgba(0,0,0,0.75)]">
                <CountryValueBlock countryName={values.country} />
              </div>
            ) : (
              <CharacteristicValueBlock
                text={card.value}
                fontSizePx={unifiedValueFontPx}
                widthMeasureRef={index === 0 ? valueWidthRef : undefined}
                overlay
              />
            )}
          </div>
        </button>
      ))}
      </div>
    </div>
  );
}
