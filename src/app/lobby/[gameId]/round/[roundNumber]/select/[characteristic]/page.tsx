"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import {
  COLOR_LABELS,
  COLOR_ICONS,
  SWEETNESS_LABELS,
  COMPOSITION_LABELS,
  GRAPE_VARIETIES,
  WINE_COUNTRIES,
  VINTAGE_YEARS,
  ALCOHOL_CONTENT_VALUES,
} from "@/lib/wine-data";
import { getDraft, setDraft } from "@/lib/lobby-round-draft";
import type { WineParams } from "@/components/game/wine-form";
import { PLAY_SELECT_PAGE_BG } from "@/components/game/play-select-screen";

const lobbySelectPageMainClass = `relative min-h-screen flex flex-col items-center pb-8 ${PLAY_SELECT_PAGE_BG}`;
const lobbySelectPageLoadingClass = `relative min-h-screen flex items-center justify-center ${PLAY_SELECT_PAGE_BG}`;

const VALID_CHARACTERISTICS = [
  "color",
  "sweetness",
  "composition",
  "grape-varieties",
  "country",
  "vintage-year",
  "alcohol-content",
  "oak-aged",
] as const;

type Characteristic = (typeof VALID_CHARACTERISTICS)[number];

export default function HostRoundSelectCharacteristicPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const roundNumber = Number(params.roundNumber);
  const characteristic = params.characteristic as string;

  const editUrl = `/lobby/${gameId}/round/${roundNumber}/edit`;
  const goBack = useHierarchicalBack(editUrl);

  const [draft, setDraftFromStorage] = useState<WineParams | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);

  useEffect(() => {
    const d = getDraft(gameId, roundNumber);
    setDraftFromStorage(d);
  }, [gameId, roundNumber]);

  useEffect(() => {
    if (draft && characteristic === "grape-varieties") {
      setSelectedGrapes(draft.grapeVarieties || []);
    }
  }, [draft, characteristic]);

  const updateDraftAndBack = (updates: Partial<WineParams>) => {
    const current = getDraft(gameId, roundNumber);
    const next: WineParams = {
      grapeVarieties: [],
      sweetness: "",
      vintageYear: "",
      country: "",
      alcoholContent: "",
      isOakAged: null,
      color: "",
      composition: "",
      ...current,
      ...updates,
    };
    setDraft(gameId, roundNumber, next);
    // Чтобы с lobby «Назад» не вёл на edit, помечаем возврат из select (см. edit page + useHierarchicalBack).
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("hierarchical-back-from-select", "1");
    }
    // router.replace вместо goBack() убирает двойную навигацию (history.back + popstate), первый тап срабатывает.
    router.replace(editUrl);
  };

  if (!VALID_CHARACTERISTICS.includes(characteristic as Characteristic)) {
    router.replace(editUrl);
    return null;
  }

  if (!draft) {
    return (
      <main className={lobbySelectPageLoadingClass}>
        <p className="text-[var(--muted-foreground)]">Загрузка...</p>
      </main>
    );
  }

  const header = (
    <div className="w-full sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={goBack}
          className="text-[var(--foreground)] hover:opacity-70 transition-opacity"
        >
          ←
        </button>
        <div className="text-sm font-bold text-[var(--primary)]">
          {characteristic === "grape-varieties"
            ? "Сорта винограда"
            : characteristic === "vintage-year"
              ? "Год урожая"
              : characteristic === "alcohol-content"
                ? "Крепость"
                : characteristic === "oak-aged"
                  ? "Выдержка в бочке"
                  : characteristic === "color"
                    ? "Цвет вина"
                    : characteristic === "sweetness"
                      ? "Сладость"
                      : characteristic === "composition"
                        ? "Состав"
                        : "Страна"}
        </div>
        <div className="w-6" />
      </div>
    </div>
  );

  const contentClass = "w-full max-w-lg mx-auto px-4 mt-4";
  const titleClass = "text-center mb-6";
  const btnSelected =
    "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105";
  const btnDefault =
    "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]";

  // ——— color ———
  if (characteristic === "color") {
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🎨</div>
            <h1 className="text-xl font-bold">Цвет вина</h1>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(COLOR_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => updateDraftAndBack({ color: value })}
                className={`p-6 rounded-2xl text-center transition-all ${
                  draft.color === value ? btnSelected : btnDefault
                }`}
              >
                <div className="text-4xl mb-2">{COLOR_ICONS[value]}</div>
                <div className="text-lg font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ——— sweetness ———
  if (characteristic === "sweetness") {
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🍬</div>
            <h1 className="text-xl font-bold">Сладость</h1>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(SWEETNESS_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => updateDraftAndBack({ sweetness: value })}
                className={`p-6 rounded-2xl text-center transition-all ${
                  draft.sweetness === value ? btnSelected : btnDefault
                }`}
              >
                <div className="text-lg font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ——— composition ———
  if (characteristic === "composition") {
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🔀</div>
            <h1 className="text-xl font-bold">Состав</h1>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(COMPOSITION_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => updateDraftAndBack({ composition: value })}
                className={`p-6 rounded-2xl text-center transition-all ${
                  draft.composition === value ? btnSelected : btnDefault
                }`}
              >
                <div className="text-2xl mb-2">{value === "MONO" ? "🍇" : "🔀"}</div>
                <div className="text-lg font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ——— grape-varieties ———
  if (characteristic === "grape-varieties") {
    const toggle = (grape: string) => {
      setSelectedGrapes((prev) =>
        prev.includes(grape) ? prev.filter((g) => g !== grape) : [...prev, grape]
      );
    };
    const filtered = GRAPE_VARIETIES.filter((g) =>
      g.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🍇</div>
            <h1 className="text-xl font-bold">Сорта винограда</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Выберите один или несколько сортов
            </p>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск сорта…"
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)] mb-4"
          />
          {selectedGrapes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedGrapes.map((grape) => (
                <span
                  key={grape}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full text-sm"
                >
                  {grape}
                  <button
                    type="button"
                    onClick={() => toggle(grape)}
                    className="hover:opacity-70 text-xs ml-1"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filtered.map((grape) => (
              <button
                key={grape}
                type="button"
                onClick={() => toggle(grape)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedGrapes.includes(grape) ? btnSelected : btnDefault
                }`}
              >
                {grape}
                {selectedGrapes.includes(grape) && <span className="ml-2">✓</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => updateDraftAndBack({ grapeVarieties: selectedGrapes })}
            className="w-full mt-4 px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90"
          >
            ✅ Сохранить
          </button>
        </div>
      </main>
    );
  }

  // ——— country ———
  if (characteristic === "country") {
    const filtered = WINE_COUNTRIES.filter((c) =>
      c.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🌍</div>
            <h1 className="text-xl font-bold">Страна производства</h1>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск страны..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)] mb-4"
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filtered.map((country) => (
              <button
                key={country}
                onClick={() => updateDraftAndBack({ country })}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  draft.country === country ? btnSelected : btnDefault
                }`}
              >
                {country}
                {draft.country === country && <span className="ml-2">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ——— vintage-year ———
  if (characteristic === "vintage-year") {
    const filtered = VINTAGE_YEARS.filter((y) => y.includes(searchQuery));
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">📅</div>
            <h1 className="text-xl font-bold">Год урожая</h1>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск года..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)] mb-4"
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filtered.map((year) => (
              <button
                key={year}
                onClick={() => updateDraftAndBack({ vintageYear: year })}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  draft.vintageYear === year ? btnSelected : btnDefault
                }`}
              >
                {year}
                {draft.vintageYear === year && <span className="ml-2">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ——— alcohol-content ———
  if (characteristic === "alcohol-content") {
    const filtered = ALCOHOL_CONTENT_VALUES.filter((v) => v.includes(searchQuery));
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🥃</div>
            <h1 className="text-xl font-bold">Крепость (%)</h1>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск крепости..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)] mb-4"
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filtered.map((value) => (
              <button
                key={value}
                onClick={() => updateDraftAndBack({ alcoholContent: value })}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  draft.alcoholContent === value ? btnSelected : btnDefault
                }`}
              >
                {value}%
                {draft.alcoholContent === value && <span className="ml-2">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ——— oak-aged ———
  if (characteristic === "oak-aged") {
    return (
      <main className={lobbySelectPageMainClass}>
        {header}
        <div className={contentClass}>
          <div className={titleClass}>
            <div className="text-4xl mb-2">🪵</div>
            <h1 className="text-xl font-bold">Выдержка в дубовой бочке</h1>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateDraftAndBack({ isOakAged: true })}
              className={`p-6 rounded-2xl text-center transition-all ${
                draft.isOakAged === true ? btnSelected : btnDefault
              }`}
            >
              <div className="text-4xl mb-2">✅</div>
              <div className="text-lg font-medium">Да</div>
            </button>
            <button
              onClick={() => updateDraftAndBack({ isOakAged: false })}
              className={`p-6 rounded-2xl text-center transition-all ${
                draft.isOakAged === false ? btnSelected : btnDefault
              }`}
            >
              <div className="text-4xl mb-2">❌</div>
              <div className="text-lg font-medium">Нет</div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  router.replace(editUrl);
  return null;
}
