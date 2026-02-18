"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RoundHistoryItem } from "@/components/profile/round-history-item";

interface GameInfo {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  createdAt: string;
  finishedAt: string | null;
  host: { id: string; name: string; avatar: string | null };
}

interface RoundHistory {
  roundNumber: number;
  status: string;
  correctAnswer: {
    grapeVarieties: string[];
    sweetness: string | null;
    vintageYear: number | null;
    country: string | null;
    alcoholContent: number | null;
    isOakAged: boolean | null;
    color: string | null;
    composition: string | null;
  };
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

interface HistoryData {
  game: GameInfo;
  gamePlayer: {
    score: number;
    position: number | null;
  };
  rounds: RoundHistory[];
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const { data: session, status: sessionStatus } = useSession();

  // Получаем номер раунда из query параметра
  const roundFilter = searchParams.get("round");
  const selectedRoundNumber = roundFilter
    ? (() => {
        const num = parseInt(roundFilter, 10);
        return isNaN(num) ? null : num;
      })()
    : null;

  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/games/${gameId}/history?userId=${session!.user.id}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Не удалось загрузить историю");
          return;
        }
        const data = await res.json();
        setHistory(data);
      } catch {
        setError("Ошибка подключения к серверу");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [gameId, session, sessionStatus, router]);

  if (sessionStatus === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍷</div>
          <p className="text-[var(--muted-foreground)]">Загрузка истории...</p>
        </div>
      </main>
    );
  }

  if (error || !history) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-xl text-[var(--error)]">{error || "История не найдена"}</p>
          <Link
            href="/profile"
            className="inline-block px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl"
          >
            Вернуться в профиль
          </Link>
        </div>
      </main>
    );
  }

  // Фильтруем раунды: если указан round в URL, показываем только этот раунд
  const displayedRounds = selectedRoundNumber
    ? history.rounds.filter((round) => round.roundNumber === selectedRoundNumber)
    : history.rounds;

  const totalScore = history.rounds.reduce((sum, round) => sum + (round.userGuess?.score || 0), 0);

  return (
    <main className="min-h-screen pb-8">
      {/* Верхняя панель */}
      <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/profile"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm flex items-center gap-1"
          >
            ← Профиль
          </Link>
          <h1 className="text-lg font-bold text-[var(--primary)]">
            📋 История ответов
            {selectedRoundNumber && ` - Раунд ${selectedRoundNumber}`}
          </h1>
          <ThemeToggle />
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        {/* Информация об игре */}
        <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono font-bold text-[var(--primary)] text-xl mb-1">
                {history.game.code}
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Хост: {history.game.host.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--primary)]">
                {history.gamePlayer.score} очков
              </div>
              {history.gamePlayer.position && (
                <div className="text-sm text-[var(--muted-foreground)] mt-1">
                  {history.gamePlayer.position === 1
                    ? "🥇 1 место"
                    : history.gamePlayer.position === 2
                    ? "🥈 2 место"
                    : history.gamePlayer.position === 3
                    ? "🥉 3 место"
                    : `#${history.gamePlayer.position} место`}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[var(--muted-foreground)] text-xs mb-1">Раундов</div>
              <div className="font-medium">{history.game.totalRounds}</div>
            </div>
            <div>
              <div className="text-[var(--muted-foreground)] text-xs mb-1">Завершена</div>
              <div className="font-medium">
                {history.game.finishedAt
                  ? new Date(history.game.finishedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Раунды */}
        <div className="space-y-4">
          {selectedRoundNumber && (
            <div className="mb-4">
              <Link
                href={`/history/${gameId}`}
                className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:opacity-80 transition-opacity"
              >
                ← Показать все раунды
              </Link>
            </div>
          )}
          {displayedRounds.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted-foreground)]">
              <div className="text-4xl mb-3">🍷</div>
              <p className="font-medium">
                {selectedRoundNumber
                  ? `Раунд ${selectedRoundNumber} не найден`
                  : "Нет раундов в этой игре"}
              </p>
            </div>
          ) : (
            displayedRounds.map((round) => (
              <RoundHistoryItem
                key={round.roundNumber}
                roundNumber={round.roundNumber}
                totalRounds={history.game.totalRounds}
                correctAnswer={round.correctAnswer}
                photos={round.photos}
                userGuess={round.userGuess}
              />
            ))
          )}
        </div>

        {/* Итоговая статистика */}
        {!selectedRoundNumber && history.rounds.length > 0 && (
          <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
            <h3 className="text-lg font-bold mb-4">📊 Итоговая статистика</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Всего раундов</div>
                <div className="text-xl font-bold">{history.rounds.length}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Всего очков</div>
                <div className="text-xl font-bold text-[var(--primary)]">{totalScore}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Средний балл</div>
                <div className="text-xl font-bold">
                  {history.rounds.length > 0
                    ? Math.round((totalScore / history.rounds.length) * 10) / 10
                    : 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Ответов отправлено</div>
                <div className="text-xl font-bold">
                  {history.rounds.filter((r) => r.userGuess !== null).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
