"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { GuessReviewCards } from "@/components/game/guess-review-cards";
import type { WineGuessFields } from "@/lib/wine-guess-display";

interface RoundHistoryItemProps {
  roundNumber: number;
  totalRounds: number;
  correctAnswer: WineGuessFields;
  photos: string[];
  userGuess: (WineGuessFields & {
    score: number;
    submittedAt: string;
  }) | null;
}

function RoundPhotosGrid({ photos }: { photos: string[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  return (
    <div>
      <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
        📸 Бутылка
      </h4>
      <div className="grid grid-cols-2 gap-2">
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

export function RoundHistoryItem({
  roundNumber,
  totalRounds,
  correctAnswer,
  photos,
  userGuess,
}: RoundHistoryItemProps) {
  return (
    <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] overflow-hidden">
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
        {photos.length > 0 && <RoundPhotosGrid photos={photos} />}

        {userGuess ? (
          <div>
            <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
              ✍️ Мои ответы
            </h4>
            <GuessReviewCards guess={userGuess} correctAnswer={correctAnswer} />
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
