"use client";

import {
  WINE_GUESS_FIELD_ORDER,
  formatWineGuessForDisplay,
  isWineGuessFieldMatch,
  type WineGuessFields,
} from "@/lib/wine-guess-display";

interface GuessReviewCardsProps {
  guess: WineGuessFields;
  correctAnswer: WineGuessFields;
  className?: string;
}

const CARD_BASE =
  "flex min-h-[4.25rem] min-w-0 flex-col rounded-xl border-[3px] p-1.5 text-left shadow-sm md:min-h-[4.5rem] portrait:md:min-h-[5rem]";

export function GuessReviewCards({
  guess,
  correctAnswer,
  className = "",
}: GuessReviewCardsProps) {
  const guessDisplay = formatWineGuessForDisplay(guess);
  const correctDisplay = formatWineGuessForDisplay(correctAnswer);

  return (
    <div className={className}>
      <div className="grid grid-cols-2 grid-rows-4 gap-2 md:gap-2.5">
        {WINE_GUESS_FIELD_ORDER.map(({ key, label }) => {
          const isMatch = isWineGuessFieldMatch(key, guess, correctAnswer);
          const guessValue = guessDisplay[key];
          const correctValue = correctDisplay[key];

          return (
            <div
              key={key}
              className={`${CARD_BASE} ${
                isMatch
                  ? "border-[#7ab889] bg-[#dff0e3] dark:border-[#4d8f62] dark:bg-[#1a3324]"
                  : "border-[#e0a0a0] bg-[#fde8e8] dark:border-[#a05858] dark:bg-[#3a2224]"
              }`}
            >
              <div className="mb-1 shrink-0 border-b border-[var(--wine-quiz-active-game-card-border)] pb-1">
                <span className="block text-[0.625rem] font-normal uppercase tracking-wide text-[var(--muted-foreground)] md:text-[0.6875rem]">
                  {label}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5">
                <div className="break-words text-[0.8125rem] font-bold leading-tight text-[var(--foreground)] md:text-sm portrait:md:text-base">
                  {guessValue}
                </div>
                {!isMatch && (
                  <div className="break-words text-[0.6875rem] font-medium leading-tight text-[var(--muted-foreground)] md:text-xs">
                    {correctValue}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
