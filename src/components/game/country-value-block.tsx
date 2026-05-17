"use client";

import { WINE_COUNTRY_TO_ISO } from "@/lib/wine-data";

type CountryValueBlockTypography = "default" | "play-answer-card";

/** Флаг + название страны (для карточки «Страна»). */
export function CountryValueBlock({
  countryName,
  typography = "default",
}: {
  countryName: string;
  typography?: CountryValueBlockTypography;
}) {
  const iso = WINE_COUNTRY_TO_ISO[countryName];
  const isPlayCard = typography === "play-answer-card";

  const flagContent = iso ? (
    <img
      src={`/flags/${iso}.png`}
      alt=""
      className="max-h-full max-w-full object-contain object-center"
      loading="eager"
      decoding="async"
    />
  ) : (
    <span
      className={
        isPlayCard
          ? "wine-quiz-answer-card__country-flag-fallback leading-none"
          : "text-[clamp(1.75rem,11cqmin,3.25rem)] leading-none"
      }
      aria-hidden
    >
      🌍
    </span>
  );

  if (isPlayCard) {
    return (
      <div className="wine-quiz-answer-card__country">
        <div className="wine-quiz-answer-card__country-col wine-quiz-answer-card__country-col--flag">
          {flagContent}
        </div>
        <div className="wine-quiz-answer-card__country-col wine-quiz-answer-card__country-col--name">
          <div className="wine-quiz-answer-card__country-name line-clamp-2 px-0.5 font-bold leading-[1.15] text-[var(--foreground)]">
            {countryName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center gap-[clamp(0.125rem,1cqmin,0.375rem)] overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-0.5">{flagContent}</div>
      <div className="line-clamp-2 w-full shrink-0 px-0.5 text-center font-bold leading-[1.15] text-[var(--foreground)] [font-size:clamp(1.5rem,9.6cqmin,2.4375rem)]">
        {countryName}
      </div>
    </div>
  );
}
