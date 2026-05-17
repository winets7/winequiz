"use client";

import type { ReactNode } from "react";

/** См. `.cursor/rules/wine-quiz-active-game-cards.mdc` */
export const PLAY_SELECT_PAGE_BG =
  "bg-[url('/pic/fon.png')] bg-cover bg-center bg-no-repeat";

export const PLAY_SELECT_CARD_BASE =
  "rounded-2xl border-4 p-6 text-center transition-all focus:outline-none focus:ring-2 focus:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]";

export function playSelectGridOptionClass(isSelected: boolean): string {
  return `${PLAY_SELECT_CARD_BASE} ${
    isSelected
      ? "scale-105 border-[var(--wine-quiz-active-game-card-border-hover)] bg-[var(--wine-quiz-active-game-card-bg-hover)] font-bold text-[var(--foreground)] shadow-lg"
      : "border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] text-[var(--foreground)] hover:border-[var(--wine-quiz-active-game-card-border-hover)] hover:bg-[var(--wine-quiz-active-game-card-bg-hover)]"
  }`;
}

export function playSelectListRowClass(isSelected: boolean): string {
  return `w-full rounded-2xl border-4 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)] ${
    isSelected
      ? "border-[var(--wine-quiz-active-game-card-border-hover)] bg-[var(--wine-quiz-active-game-card-bg-hover)] font-bold text-[var(--foreground)] shadow-lg"
      : "border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] text-[var(--foreground)] hover:border-[var(--wine-quiz-active-game-card-border-hover)] hover:bg-[var(--wine-quiz-active-game-card-bg-hover)]"
  }`;
}

export const PLAY_SELECT_INPUT_CLASS =
  "w-full rounded-2xl border-4 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]";

export const PLAY_SELECT_SAVE_BUTTON_CLASS =
  "w-full rounded-2xl border-4 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] px-6 py-4 text-lg font-bold text-[var(--foreground)] shadow-lg transition-colors hover:border-[var(--wine-quiz-active-game-card-border-hover)] hover:bg-[var(--wine-quiz-active-game-card-bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]";

export const PLAY_SELECT_CHIP_CLASS =
  "inline-flex items-center gap-1 rounded-full border-2 border-[var(--wine-quiz-active-game-card-border-hover)] bg-[var(--wine-quiz-active-game-card-bg-hover)] px-3 py-1 text-sm font-medium text-[var(--foreground)]";

/** Подложка сетки — как блок карточек ответов на /play/[gameId] в раунде */
export const PLAY_SELECT_GRID_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl ring-2 ring-black/15 shadow-lg dark:ring-white/20";

type PlaySelectGridPanelProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function PlaySelectGridPanel({
  children,
  className = "",
  innerClassName = "",
}: PlaySelectGridPanelProps) {
  return (
    <div className={`${PLAY_SELECT_GRID_PANEL_CLASS} ${className}`.trim()}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${PLAY_SELECT_PAGE_BG}`}
      />
      <div className={`relative z-[1] p-2 sm:p-3 ${innerClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}

type PlaySelectScreenProps = {
  barTitle: string;
  heading: string;
  emoji?: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
};

export function PlaySelectScreen({
  barTitle,
  heading,
  emoji,
  subtitle,
  onBack,
  children,
}: PlaySelectScreenProps) {
  return (
    <main
      className={`relative flex min-h-screen flex-col items-center pb-8 ${PLAY_SELECT_PAGE_BG}`}
    >
      <div className="sticky top-0 z-10 w-full border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/65">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-[var(--foreground)] transition-opacity hover:opacity-70"
            aria-label="Назад"
          >
            ←
          </button>
          <div className="text-sm font-bold text-[var(--primary)]">{barTitle}</div>
          <div className="w-6" aria-hidden />
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-lg px-4">
        <div className="mb-6 space-y-4 text-center">
          {emoji ? (
            <div className="text-4xl" aria-hidden>
              {emoji}
            </div>
          ) : null}
          <h1 className="wine-quiz-page-title text-2xl font-bold sm:text-3xl">
            {heading}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}
