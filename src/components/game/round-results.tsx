"use client";

import { useState } from "react";
import {
  SWEETNESS_LABELS,
  COLOR_LABELS,
  COLOR_ICONS,
  COMPOSITION_LABELS,
} from "@/lib/wine-data";
import { ImageLightbox } from "@/components/ui/image-lightbox";

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

interface PlayerResult {
  userId: string;
  name: string;
  guess: WineAnswer;
  score: number;
}

interface RoundResultsProps {
  roundNumber: number;
  totalRounds: number;
  correctAnswer: WineAnswer;
  photos: string[];
  results: PlayerResult[];
  currentUserId?: string;
}

function RoundPhotosGrid({ photos }: { photos: string[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  return (
    <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
      <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">📸 Бутылка</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)] block w-full text-left focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            onClick={() => setLightboxUrl(url)}
          >
            <img
              src={url}
              alt={`Фото ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      {lightboxUrl && (
        <ImageLightbox
          src={lightboxUrl}
          alt="Фото бутылки"
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
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

export function RoundResults({
  roundNumber,
  totalRounds,
  correctAnswer,
  photos,
  results,
  currentUserId,
}: RoundResultsProps) {
  const formatAnswer = (answer: WineAnswer) => ({
    color: answer.color ? (COLOR_ICONS[answer.color] || "") + " " + (COLOR_LABELS[answer.color] || answer.color) : "—",
    sweetness: answer.sweetness ? SWEETNESS_LABELS[answer.sweetness] || answer.sweetness : "—",
    composition: answer.composition ? COMPOSITION_LABELS[answer.composition] || answer.composition : "—",
    grapes: answer.grapeVarieties.length > 0 ? answer.grapeVarieties.join(", ") : "—",
    country: answer.country || "—",
    year: answer.vintageYear?.toString() || "—",
    alcohol: answer.alcoholContent != null ? `${answer.alcoholContent}%` : "—",
    oak: answer.isOakAged === true ? "Да" : answer.isOakAged === false ? "Нет" : "—",
  });

  const correct = formatAnswer(correctAnswer);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-xl font-bold">
          📊 Результаты раунда {roundNumber}/{totalRounds}
        </h2>
      </div>

      {/* Фотографии бутылки */}
      {photos.length > 0 && (
        <RoundPhotosGrid photos={photos} />
      )}

      {/* Правильные ответы */}
      <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
        <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">🍷 Правильные ответы</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
          <div><span className="text-[var(--muted-foreground)]">Цвет:</span> <span className="font-medium">{correct.color}</span></div>
          <div><span className="text-[var(--muted-foreground)]">Сладость:</span> <span className="font-medium">{correct.sweetness}</span></div>
          <div><span className="text-[var(--muted-foreground)]">Состав:</span> <span className="font-medium">{correct.composition}</span></div>
          <div><span className="text-[var(--muted-foreground)]">Бочка:</span> <span className="font-medium">{correct.oak}</span></div>
          <div><span className="text-[var(--muted-foreground)]">Страна:</span> <span className="font-medium">{correct.country}</span></div>
          <div><span className="text-[var(--muted-foreground)]">Год:</span> <span className="font-medium">{correct.year}</span></div>
          <div><span className="text-[var(--muted-foreground)]">Крепость:</span> <span className="font-medium">{correct.alcohol}</span></div>
          <div className="col-span-2 md:col-span-3 lg:col-span-4"><span className="text-[var(--muted-foreground)]">Сорта:</span> <span className="font-medium">{correct.grapes}</span></div>
        </div>
      </div>

      {/* Рейтинг игроков */}
      <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
        <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">🏆 Рейтинг раунда</h3>
        <div className="space-y-3">
          {results.map((result, index) => {
            const guess = formatAnswer(result.guess);
            const isCurrentUser = result.userId === currentUserId;
            const correctGrapes = correctAnswer.grapeVarieties.map((g) =>
              g.toLowerCase().trim()
            );
            const guessedGrapes = result.guess.grapeVarieties.map((g) =>
              g.toLowerCase().trim()
            );
            const matchedGrapes = guessedGrapes.filter((g) =>
              correctGrapes.includes(g)
            );
            return (
              <div
                key={result.userId}
                className={`rounded-xl p-3 ${
                  isCurrentUser
                    ? "bg-[var(--primary)] bg-opacity-10 border border-[var(--primary)]"
                    : "bg-[var(--muted)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                    </span>
                    <span className="font-medium">
                      {result.name}
                      {isCurrentUser && " (вы)"}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-[var(--primary)]">
                    +{result.score}
                  </span>
                </div>

                {/* Детали угадывания */}
                <div className="text-xs space-y-0.5 ml-8">
                  <ParamRow label="Цвет" correct={correct.color} guess={guess.color} isMatch={result.guess.color === correctAnswer.color} />
                  <ParamRow label="Сладость" correct={correct.sweetness} guess={guess.sweetness} isMatch={result.guess.sweetness === correctAnswer.sweetness} />
                  <ParamRow label="Состав" correct={correct.composition} guess={guess.composition} isMatch={result.guess.composition === correctAnswer.composition} />
                  <ParamRow label="Бочка" correct={correct.oak} guess={guess.oak} isMatch={result.guess.isOakAged === correctAnswer.isOakAged} />
                  <ParamRow label="Страна" correct={correct.country} guess={guess.country}
                    isMatch={result.guess.country?.toLowerCase().trim() === correctAnswer.country?.toLowerCase().trim()} />
                  <ParamRow label="Год" correct={correct.year} guess={guess.year} isMatch={result.guess.vintageYear === correctAnswer.vintageYear} />
                  <ParamRow label="Крепость" correct={correct.alcohol} guess={guess.alcohol}
                    isMatch={result.guess.alcoholContent != null && correctAnswer.alcoholContent != null && Math.abs(result.guess.alcoholContent - correctAnswer.alcoholContent) <= 0.5} />
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
                      {guess.grapes}
                    </span>
                    {matchedGrapes.length > 0 && (
                      <span className="text-[var(--muted-foreground)] text-xs ml-auto">
                        Угадано: {matchedGrapes.length} из{" "}
                        {correctAnswer.grapeVarieties.length}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
