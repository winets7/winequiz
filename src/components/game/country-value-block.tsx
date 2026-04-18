"use client";

import { WINE_COUNTRY_TO_ISO } from "@/lib/wine-data";

/** Флаг по размеру ячейки + название страны снизу (для карточки «Страна»). */
export function CountryValueBlock({ countryName }: { countryName: string }) {
  const iso = WINE_COUNTRY_TO_ISO[countryName];
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center gap-[clamp(0.125rem,1cqmin,0.375rem)] overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-0.5">
        {iso ? (
          <img
            src={`/flags/${iso}.png`}
            alt=""
            className="max-h-full max-w-full object-contain object-center"
            loading="eager"
            decoding="async"
          />
        ) : (
          <span className="text-[clamp(1.75rem,11cqmin,3.25rem)] leading-none" aria-hidden>
            🌍
          </span>
        )}
      </div>
      <div className="line-clamp-2 w-full shrink-0 px-0.5 text-center font-bold leading-[1.15] text-[var(--foreground)] [font-size:clamp(0.5rem,3.2cqmin,0.8125rem)]">
        {countryName}
      </div>
    </div>
  );
}
