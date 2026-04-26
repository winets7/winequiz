"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RoundHistoryItem } from "@/components/profile/round-history-item";
import { RoundResults } from "@/components/game/round-results";
import { HostRoundPlayersStatus } from "@/components/game/host-round-players-status";

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

interface HostHistoryData {
  isHostView: true;
  game: GameInfo;
  players: Array<{
    user: {
      id: string;
      name: string;
      avatar: string | null;
    };
    gamePlayer: {
      score: number;
      position: number | null;
    };
    rounds: RoundHistory[];
  }>;
}

interface HostRoundOverview {
  isHost: true;
  game: GameInfo;
  round: {
    roundNumber: number;
    status: string;
    correctAnswer: RoundHistory["correctAnswer"];
    photos: string[];
  };
  players: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    hasSubmitted: boolean;
  }>;
  results?: Array<{
    userId: string;
    name: string;
    guess: RoundHistory["correctAnswer"];
    score: number;
  }>;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const { data: session, status: sessionStatus } = useSession();

  const roundFilter = searchParams.get("round");
  const selectedRoundNumber = roundFilter
    ? (() => {
        const num = parseInt(roundFilter, 10);
        return Number.isNaN(num) ? null : num;
      })()
    : null;

  const [history, setHistory] = useState<HistoryData | HostHistoryData | null>(null);
  const [hostOverview, setHostOverview] = useState<HostRoundOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHostOverview = useCallback(async () => {
    if (!selectedRoundNumber) return null;
    const res = await fetch(
      `/api/games/${gameId}/round/${selectedRoundNumber}/host-overview`
    );
    if (!res.ok) return null;
    return (await res.json()) as HostRoundOverview;
  }, [gameId, selectedRoundNumber]);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setHostOverview(null);
      setHistory(null);

      if (selectedRoundNumber) {
        const hostRes = await fetch(
          `/api/games/${gameId}/round/${selectedRoundNumber}/host-overview`
        );
        if (cancelled) return;

        if (hostRes.ok) {
          const data = (await hostRes.json()) as HostRoundOverview;
          setHostOverview(data);
          setLoading(false);
          return;
        }

        if (hostRes.status === 404) {
          const err = await hostRes.json().catch(() => ({}));
          setError(err.error || "Раунд не найден");
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(`/api/games/${gameId}/history`);
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Не удалось загрузить историю");
          return;
        }
        const data = await res.json();
        setHistory(data);
      } catch {
        if (!cancelled) setError("Ошибка подключения к серверу");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId, session, sessionStatus, router, selectedRoundNumber]);

  const liveRoundStatus = hostOverview?.round.status;

  useEffect(() => {
    if (liveRoundStatus !== "ACTIVE" && liveRoundStatus !== "CREATED") return;

    let cancelled = false;
    const id = window.setInterval(() => {
      void (async () => {
        const next = await fetchHostOverview();
        if (!cancelled && next) setHostOverview(next);
      })();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [liveRoundStatus, fetchHostOverview]);

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

  if (error && !hostOverview) {
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

  if (hostOverview && selectedRoundNumber) {
    const { game, round, players, results } = hostOverview;
    const isClosed = round.status === "CLOSED";

    return (
      <main className="min-h-screen pb-8">
        <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
              <Link
                href={`/lobby/${gameId}`}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm shrink-0"
              >
                ← Лобби
              </Link>
              <Link
                href="/profile"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm shrink-0 hidden sm:inline"
              >
                Профиль
              </Link>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--primary)] text-center truncate">
              Раунд {round.roundNumber}/{game.totalRounds}
            </h1>
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
          <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="font-mono font-bold text-[var(--primary)] text-xl mb-1">
                  {game.code}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Организатор: {game.host.name}
                </div>
              </div>
              <div
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  round.status === "CREATED"
                    ? "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]"
                    : round.status === "ACTIVE"
                    ? "border-[var(--primary)] bg-[var(--primary)] bg-opacity-10 text-[var(--primary)]"
                    : "border-[var(--success)] bg-[var(--success)] bg-opacity-10 text-[var(--success)]"
                }`}
              >
                {round.status === "CREATED" && "Не начат"}
                {round.status === "ACTIVE" && "Идёт"}
                {round.status === "CLOSED" && "Завершён"}
              </div>
            </div>
          </div>

          {!isClosed && (
            <HostRoundPlayersStatus players={players} roundStatus={round.status} />
          )}

          {isClosed && results && results.length > 0 && (
            <RoundResults
              roundNumber={round.roundNumber}
              totalRounds={game.totalRounds}
              correctAnswer={round.correctAnswer}
              photos={round.photos}
              results={results}
              currentUserId={session?.user?.id}
            />
          )}

          {isClosed && (!results || results.length === 0) && (
            <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-8 text-center text-[var(--muted-foreground)]">
              <p className="font-medium mb-2">Раунд завершён</p>
              <p className="text-sm">В комнате не было игроков для отображения результатов.</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!history) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-xl text-[var(--error)]">Данные не загружены</p>
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

  if ("isHostView" in history && history.isHostView) {
    return (
      <main className="min-h-screen pb-8">
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

        <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
          <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono font-bold text-[var(--primary)] text-xl mb-1">
                  {history.game.code}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Режим организатора: результаты всех игроков
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[var(--muted-foreground)]">Игроков</div>
                <div className="text-2xl font-bold text-[var(--primary)]">
                  {history.players.length}
                </div>
              </div>
            </div>
          </div>

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

          {history.players.length === 0 ? (
            <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-8 text-center text-[var(--muted-foreground)]">
              В этой игре не было игроков для отображения истории.
            </div>
          ) : (
            history.players.map((player) => {
              const displayedRounds = selectedRoundNumber
                ? player.rounds.filter((r) => r.roundNumber === selectedRoundNumber)
                : player.rounds;

              return (
                <section
                  key={player.user.id}
                  className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{player.user.name}</h2>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {player.gamePlayer.position
                          ? `Место: ${player.gamePlayer.position}`
                          : "Место: —"}
                      </p>
                    </div>
                    <div className="text-xl font-bold text-[var(--primary)]">
                      {player.gamePlayer.score} очков
                    </div>
                  </div>

                  {displayedRounds.length === 0 ? (
                    <div className="text-sm text-[var(--muted-foreground)] py-2">
                      Для выбранного раунда данных нет.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayedRounds.map((round) => (
                        <RoundHistoryItem
                          key={`${player.user.id}-${round.roundNumber}`}
                          roundNumber={round.roundNumber}
                          totalRounds={history.game.totalRounds}
                          correctAnswer={round.correctAnswer}
                          photos={round.photos}
                          userGuess={round.userGuess}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </main>
    );
  }

  const playerHistory = history as HistoryData;

  const displayedRounds = selectedRoundNumber
    ? playerHistory.rounds.filter((r) => r.roundNumber === selectedRoundNumber)
    : playerHistory.rounds;

  const totalScore = playerHistory.rounds.reduce(
    (sum, round) => sum + (round.userGuess?.score || 0),
    0
  );

  return (
    <main className="min-h-screen pb-8">
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

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono font-bold text-[var(--primary)] text-xl mb-1">
                {playerHistory.game.code}
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Хост: {playerHistory.game.host.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--primary)]">
                {playerHistory.gamePlayer.score} очков
              </div>
              {playerHistory.gamePlayer.position && (
                <div className="text-sm text-[var(--muted-foreground)] mt-1">
                  {playerHistory.gamePlayer.position === 1
                    ? "🥇 1 место"
                    : playerHistory.gamePlayer.position === 2
                    ? "🥈 2 место"
                    : playerHistory.gamePlayer.position === 3
                    ? "🥉 3 место"
                    : `#${playerHistory.gamePlayer.position} место`}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[var(--muted-foreground)] text-xs mb-1">Раундов</div>
              <div className="font-medium">{playerHistory.game.totalRounds}</div>
            </div>
            <div>
              <div className="text-[var(--muted-foreground)] text-xs mb-1">Завершена</div>
              <div className="font-medium">
                {playerHistory.game.finishedAt
                  ? new Date(playerHistory.game.finishedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>
        </div>

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
                totalRounds={playerHistory.game.totalRounds}
                correctAnswer={round.correctAnswer}
                photos={round.photos}
                userGuess={round.userGuess}
              />
            ))
          )}
        </div>

        {!selectedRoundNumber && playerHistory.rounds.length > 0 && (
          <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
            <h3 className="text-lg font-bold mb-4">📊 Итоговая статистика</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Всего раундов</div>
                <div className="text-xl font-bold">{playerHistory.rounds.length}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Всего очков</div>
                <div className="text-xl font-bold text-[var(--primary)]">{totalScore}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Средний балл</div>
                <div className="text-xl font-bold">
                  {playerHistory.rounds.length > 0
                    ? Math.round((totalScore / playerHistory.rounds.length) * 10) / 10
                    : 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">
                  Ответов отправлено
                </div>
                <div className="text-xl font-bold">
                  {playerHistory.rounds.filter((r) => r.userGuess !== null).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
