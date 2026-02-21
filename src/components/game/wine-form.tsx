"use client";

import { useState, useRef } from "react";
import {
  GRAPE_VARIETIES,
  WINE_COUNTRIES,
  SWEETNESS_LABELS,
  COLOR_LABELS,
  COLOR_ICONS,
  COMPOSITION_LABELS,
} from "@/lib/wine-data";

export interface WineParams {
  grapeVarieties: string[];
  sweetness: string;
  vintageYear: string;
  country: string;
  alcoholContent: string;
  isOakAged: boolean | null;
  color: string;
  composition: string;
}

interface WineFormProps {
  /** Режим: host — ввод правильного ответа, player — угадывание */
  mode: "host" | "player";
  /** Начальные значения (для редактирования) */
  initialValues?: Partial<WineParams>;
  /** Callback при сабмите */
  onSubmit: (params: WineParams) => void;
  /** Загрузка */
  loading?: boolean;
  /** Текст кнопки */
  submitLabel?: string;
  /** Блокировка формы */
  disabled?: boolean;
}

const emptyParams: WineParams = {
  grapeVarieties: [],
  sweetness: "",
  vintageYear: "",
  country: "",
  alcoholContent: "",
  isOakAged: null,
  color: "",
  composition: "",
};

export function WineForm({
  mode,
  initialValues,
  onSubmit,
  loading = false,
  submitLabel,
  disabled = false,
}: WineFormProps) {
  const [params, setParams] = useState<WineParams>({
    ...emptyParams,
    ...initialValues,
  });
  const [grapeInput, setGrapeInput] = useState("");
  const [showGrapeSuggestions, setShowGrapeSuggestions] = useState(false);
  const grapeInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof WineParams, value: unknown) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  // === Логика тегов для сортов винограда ===
  const filteredGrapes = GRAPE_VARIETIES.filter(
    (g) =>
      g.toLowerCase().includes(grapeInput.toLowerCase()) &&
      !params.grapeVarieties.includes(g)
  );

  const addGrape = (grape: string) => {
    const trimmed = grape.trim();
    if (trimmed && !params.grapeVarieties.includes(trimmed)) {
      update("grapeVarieties", [...params.grapeVarieties, trimmed]);
    }
    setGrapeInput("");
    setShowGrapeSuggestions(false);
    grapeInputRef.current?.focus();
  };

  const removeGrape = (grape: string) => {
    update(
      "grapeVarieties",
      params.grapeVarieties.filter((g) => g !== grape)
    );
  };

  const handleGrapeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && grapeInput.trim()) {
      e.preventDefault();
      addGrape(grapeInput);
    }
    if (
      e.key === "Backspace" &&
      !grapeInput &&
      params.grapeVarieties.length > 0
    ) {
      removeGrape(params.grapeVarieties[params.grapeVarieties.length - 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params);
  };

  const buttonText =
    submitLabel || (mode === "host" ? "🍷 Начать раунд" : "✅ Отправить ответ");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* === Цвет вина === */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          🎨 Цвет вина
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(COLOR_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => update("color", value)}
              className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                params.color === value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                  : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
              }`}
            >
              <div className="text-lg">{COLOR_ICONS[value]}</div>
              <div className="mt-0.5">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* === Сладость === */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          🍬 Сладость
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SWEETNESS_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => update("sweetness", value)}
              className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                params.sweetness === value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                  : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* === Состав === */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          🔀 Состав
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(COMPOSITION_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => update("composition", value)}
              className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                params.composition === value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                  : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
              }`}
            >
              {value === "MONO" ? "🍇 " : "🔀 "}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* === Сорта винограда === */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          🍇 Сорт(а) винограда
          {params.composition === "BLEND" && (
            <span className="text-[var(--secondary)] ml-1">(можно несколько)</span>
          )}
        </label>

        {/* Теги выбранных сортов */}
        {params.grapeVarieties.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {params.grapeVarieties.map((grape) => (
              <span
                key={grape}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full text-sm"
              >
                {grape}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeGrape(grape)}
                    className="hover:opacity-70 text-xs ml-1"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Поле ввода */}
        <div className="relative">
          <input
            ref={grapeInputRef}
            type="text"
            value={grapeInput}
            disabled={disabled}
            onChange={(e) => {
              setGrapeInput(e.target.value);
              setShowGrapeSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowGrapeSuggestions(grapeInput.length > 0)}
            onBlur={() => setTimeout(() => setShowGrapeSuggestions(false), 200)}
            onKeyDown={handleGrapeKeyDown}
            placeholder="Введите сорт и нажмите Enter..."
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />

          {/* Подсказки */}
          {showGrapeSuggestions && filteredGrapes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto z-20">
              {filteredGrapes.slice(0, 8).map((grape) => (
                <button
                  key={grape}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addGrape(grape)}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--muted)] transition-colors text-sm first:rounded-t-xl last:rounded-b-xl"
                >
                  {grape}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === Страна === */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          🌍 Страна производства
        </label>
        <select
          value={params.country}
          disabled={disabled}
          onChange={(e) => update("country", e.target.value)}
          className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
        >
          <option value="">Выберите страну...</option>
          {WINE_COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      {/* === Год урожая и крепость === */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            📅 Год урожая
          </label>
          <input
            type="number"
            value={params.vintageYear}
            disabled={disabled}
            onChange={(e) => update("vintageYear", e.target.value)}
            placeholder="2020"
            min="1900"
            max="2030"
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            🥃 Крепость (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={params.alcoholContent}
            disabled={disabled}
            onChange={(e) => update("alcoholContent", e.target.value)}
            placeholder="13.5"
            min="0"
            max="25"
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
      </div>

      {/* === Выдержка в бочке === */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          🪵 Выдержка в дубовой бочке
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => update("isOakAged", true)}
            className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
              params.isOakAged === true
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            ✅ Да
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => update("isOakAged", false)}
            className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
              params.isOakAged === false
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-105"
                : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            ❌ Нет
          </button>
        </div>
      </div>

      {/* === Кнопка отправки === */}
      <button
        type="submit"
        disabled={loading || disabled}
        className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> Отправка...
          </span>
        ) : (
          buttonText
        )}
      </button>
    </form>
  );
}
