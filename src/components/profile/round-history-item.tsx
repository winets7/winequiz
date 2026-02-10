"use client";

import {
  SWEETNESS_LABELS,
  COLOR_LABELS,
  COLOR_ICONS,
  COMPOSITION_LABELS,
} from "@/lib/wine-data";

interface WineAnswer {
  grapeVarieties: string[];
  sweetness: string | null;
  vintageYear: number | null;
  country: string | null;
  alcoholContent: number | null;
  isOakAged: boolean | null;
  color: string | null;
  composition: string | null;
}

interface RoundHistoryItemProps {
  roundNumber: number;
  totalRounds: number;
  correctAnswer: WineAnswer;
  photos: string[];
  userGuess: {
    grapeVarieties: string[];
    sweetness: string | null;
    vintageYear: number | null;
    country: string | null;
    alcoholContent: number | null;
    isOakAged: boolean | null;
    color: string | null;
    composition: string | null;
    score: number;
    submittedAt: string;
  } | null;
}

function ParamRow({
  label,
  correct,
  guess,
  isMatch,
}: {
  label: string;
  correct: string;
  guess: string;
  isMatch: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <span className={`text-base ${isMatch ? "" : "opacity-40"}`}>
        {isMatch ? "✅" : "❌"}
      </span>
      <span className="text-[var(--muted-foreground)] min-w-[80px]">{label}</span>
      <span className={`font-medium ${isMatch ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
        {guess || "—"}
      </span>
      {!isMatch && (
        <span className="text-[var(--muted-foreground)] text-xs ml-auto">
          → {correct}
        </span>
      )}
    </div>
  );
}

export function RoundHistoryItem({
  roundNumber,
  totalRounds,
  correctAnswer,
  photos,
  userGuess,
}: RoundHistoryItemProps) {
  const formatAnswer = (answer: WineAnswer) => ({
    color: answer.color
      ? (COLOR_ICONS[answer.color] || "") + " " + (COLOR_LABELS[answer.color] || answer.color)
      : "—",
    sweetness: answer.sweetness
      ? SWEETNESS_LABELS[answer.sweetness] || answer.sweetness
      : "—",
    composition: answer.composition
      ? COMPOSITION_LABELS[answer.composition] || answer.composition
      : "—",
    grapes:
      answer.grapeVarieties.length > 0 ? answer.grapeVarieties.join(", ") : "—",
    country: answer.country || "—",
    year: answer.vintageYear?.toString() || "—",
    alcohol: answer.alcoholContent != null ? `${answer.alcoholContent}%` : "—",
    oak: answer.isOakAged === true ? "Да" : answer.isOakAged === false ? "Нет" : "—",
  });

  const correct = formatAnswer(correctAnswer);
  const guess = userGuess ? formatAnswer(userGuess) : null;

  // Функции проверки совпадений
  const isColorMatch = userGuess?.color === correctAnswer.color;
  const isSweetnessMatch = userGuess?.sweetness === correctAnswer.sweetness;
  const isCompositionMatch = userGuess?.composition === correctAnswer.composition;
  const isOakMatch = userGuess?.isOakAged === correctAnswer.isOakAged;
  const isCountryMatch =
    userGuess?.country?.toLowerCase().trim() ===
    correctAnswer.country?.toLowerCase().trim();
  const isYearMatch = userGuess?.vintageYear === correctAnswer.vintageYear;
  const isAlcoholMatch =
    userGuess?.alcoholContent != null &&
    correctAnswer.alcoholContent != null &&
    Math.abs(userGuess.alcoholContent - correctAnswer.alcoholContent) <= 0.5;

  // Проверка сортов винограда
  const correctGrapes = correctAnswer.grapeVarieties.map((g) => g.toLowerCase().trim());
  const guessedGrapes = userGuess?.grapeVarieties.map((g) => g.toLowerCase().trim()) || [];
  const matchedGrapes = guessedGrapes.filter((g) => correctGrapes.includes(g));

  return (
    <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] overflow-hidden">
      {/* Заголовок раунда */}
      <div className="bg-[var(--muted)] px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            Раунд {roundNumber}/{totalRounds}
          </h3>
          {userGuess && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted-foreground)]">Баллы:</span>
              <span className="text-xl font-bold text-[var(--primary)]">
                +{userGuess.score}
              </span>
            </div>
          )}
          {!userGuess && (
            <span className="text-sm text-[var(--muted-foreground)]">
              Ответ не отправлен
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Фотографии бутылки */}
        {photos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
              📸 Бутылка
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((url, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)]"
                >
                  <img
                    src={url}
                    alt={`Фото ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Правильные ответы */}
        <div>
          <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
            🍷 Правильные ответы
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-[var(--muted)] rounded-xl p-4">
            <div>
              <span className="text-[var(--muted-foreground)]">Цвет:</span>{" "}
              <span className="font-medium">{correct.color}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Сладость:</span>{" "}
              <span className="font-medium">{correct.sweetness}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Состав:</span>{" "}
              <span className="font-medium">{correct.composition}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Бочка:</span>{" "}
              <span className="font-medium">{correct.oak}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Страна:</span>{" "}
              <span className="font-medium">{correct.country}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Год:</span>{" "}
              <span className="font-medium">{correct.year}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Крепость:</span>{" "}
              <span className="font-medium">{correct.alcohol}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--muted-foreground)]">Сорта:</span>{" "}
              <span className="font-medium">{correct.grapes}</span>
            </div>
          </div>
        </div>

        {/* Мои ответы */}
        {userGuess ? (
          <div>
            <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
              ✍️ Мои ответы
            </h4>
            <div className="bg-[var(--primary)] bg-opacity-10 border border-[var(--primary)] rounded-xl p-4 space-y-0.5">
              <ParamRow
                label="Цвет"
                correct={correct.color}
                guess={guess!.color}
                isMatch={isColorMatch}
              />
              <ParamRow
                label="Сладость"
                correct={correct.sweetness}
                guess={guess!.sweetness}
                isMatch={isSweetnessMatch}
              />
              <ParamRow
                label="Состав"
                correct={correct.composition}
                guess={guess!.composition}
                isMatch={isCompositionMatch}
              />
              <ParamRow
                label="Бочка"
                correct={correct.oak}
                guess={guess!.oak}
                isMatch={isOakMatch}
              />
              <ParamRow
                label="Страна"
                correct={correct.country}
                guess={guess!.country}
                isMatch={isCountryMatch}
              />
              <ParamRow
                label="Год"
                correct={correct.year}
                guess={guess!.year}
                isMatch={isYearMatch}
              />
              <ParamRow
                label="Крепость"
                correct={correct.alcohol}
                guess={guess!.alcohol}
                isMatch={isAlcoholMatch}
              />
              <div className="flex items-center gap-2 text-sm py-1">
                <span
                  className={`text-base ${
                    matchedGrapes.length > 0 ? "" : "opacity-40"
                  }`}
                >
                  {matchedGrapes.length > 0 ? "✅" : "❌"}
                </span>
                <span className="text-[var(--muted-foreground)] min-w-[80px]">
                  Сорта
                </span>
                <span
                  className={`font-medium ${
                    matchedGrapes.length > 0
                      ? "text-[var(--success)]"
                      : "text-[var(--error)]"
                  }`}
                >
                  {guess!.grapes}
                </span>
                {matchedGrapes.length > 0 && (
                  <span className="text-[var(--muted-foreground)] text-xs ml-auto">
                    Угадано: {matchedGrapes.length} из {correctAnswer.grapeVarieties.length}
                  </span>
                )}
                {matchedGrapes.length === 0 && (
                  <span className="text-[var(--muted-foreground)] text-xs ml-auto">
                    → {correct.grapes}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-[var(--muted-foreground)]">
            <div className="text-3xl mb-2">⏭️</div>
            <p className="text-sm">Вы не отправили ответ в этом раунде</p>
          </div>
        )}
      </div>
    </div>
  );
}
