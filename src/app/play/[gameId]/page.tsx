"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WineForm, WineParams } from "@/components/game/wine-form";
import { RoundResults } from "@/components/game/round-results";
import { CharacteristicCards } from "@/components/game/characteristic-cards";

// =============================================
// Типы
// =============================================

type GamePhase =
  | "LOADING"
  | "ROUND_READY"      // Хост видит кнопку «Запустить раунд»
  | "ROUND_ACTIVE"     // Участники угадывают
  | "GUESS_SUBMITTED"  // Участник отправил догадку
  | "ROUND_RESULTS"    // Результаты раунда
  | "GAME_FINISHED";   // Игра завершена

interface GameData {
  id: string;
  code: string;
  status: string;
  hostId: string;
  maxPlayers: number;
  totalRounds: number;
  currentRound: number;
  host: { id: string; name: string; avatar: string | null };
}

interface RoundInfo {
  id: string;
  roundNumber: number;
  status: string;
  color: string | null;
  country: string | null;
  grapeVarieties: string[];
}

interface RoundResultData {
  roundNumber: number;
  totalRounds: number;
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
  results: Array<{
    userId: string;
    name: string;
    guess: {
      grapeVarieties: string[];
      sweetness: string | null;
      vintageYear: number | null;
      country: string | null;
      alcoholContent: number | null;
      isOakAged: boolean | null;
      color: string | null;
      composition: string | null;
    };
    score: number;
  }>;
}

interface Ranking {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
}

// =============================================
// Компонент страницы
// =============================================

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { data: session } = useSession();

  const { isConnected, emit, on } = useSocket();

  // Состояния
  const [game, setGame] = useState<GameData | null>(null);
  const [phase, setPhase] = useState<GamePhase>("LOADING");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [guessCount, setGuessCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guessValues, setGuessValues] = useState<Partial<WineParams>>({});

  const userId = session?.user?.id;
  const isHost = game?.host?.id === userId;

  // =============================================
  // Загрузка сохраненных значений из localStorage
  // =============================================
  const loadSavedValues = useCallback(() => {
    if (!gameId) return;
    
    const saved: Partial<WineParams> = {
      color: localStorage.getItem(`wine-guess-${gameId}-color`) || "",
      sweetness: localStorage.getItem(`wine-guess-${gameId}-sweetness`) || "",
      composition: localStorage.getItem(`wine-guess-${gameId}-composition`) || "",
      country: localStorage.getItem(`wine-guess-${gameId}-country`) || "",
      vintageYear: localStorage.getItem(`wine-guess-${gameId}-vintageYear`) || "",
      alcoholContent: localStorage.getItem(`wine-guess-${gameId}-alcoholContent`) || "",
      grapeVarieties: JSON.parse(localStorage.getItem(`wine-guess-${gameId}-grapeVarieties`) || "[]"),
      isOakAged: (() => {
        const saved = localStorage.getItem(`wine-guess-${gameId}-isOakAged`);
        if (saved === null) return null;
        return saved === "true";
      })(),
    };
    setGuessValues(saved);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !userId) return;
    
    loadSavedValues();
    
    // Слушаем изменения в localStorage (для синхронизации между вкладками и страницами)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith(`wine-guess-${gameId}-`)) {
        loadSavedValues();
      }
    };
    
    // Также слушаем кастомные события для обновления в той же вкладке
    const handleCustomStorageChange = () => {
      loadSavedValues();
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);
    
    // Обновляем при фокусе окна и изменении видимости (когда пользователь возвращается на страницу)
    const handleFocus = () => {
      loadSavedValues();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSavedValues();
      }
    };
    
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [gameId, userId, loadSavedValues]);

  // =============================================
  // Загрузка данных игры
  // =============================================
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (!res.ok) {
          setError("Игра не найдена");
          return;
        }
        const data = await res.json();
        const g = data.game;
        setGame({
          id: g.id,
          code: g.code,
          status: g.status,
          hostId: g.hostId || g.host?.id,
          maxPlayers: g.maxPlayers,
          totalRounds: g.totalRounds,
          currentRound: g.currentRound,
          host: g.host,
        });
        setCurrentRound(g.currentRound || 1);
        setTotalPlayers(g.players?.length || 0);

        // Загружаем раунды
        let loadedRounds: RoundInfo[] = [];
        const roundsRes = await fetch(`/api/rounds?gameId=${gameId}`);
        if (roundsRes.ok) {
          const roundsData = await roundsRes.json();
          loadedRounds = (roundsData.rounds || []).map((r: RoundInfo) => ({
            id: r.id,
            roundNumber: r.roundNumber,
            status: r.status,
            color: r.color,
            country: r.country,
            grapeVarieties: r.grapeVarieties,
          }));
          setRounds(loadedRounds);
        }

        // Определяем начальную фазу на основе состояния в БД
        if (g.status === "FINISHED") {
          setPhase("GAME_FINISHED");
        } else if (g.status === "PLAYING") {
          // Проверяем, есть ли активный раунд
          const activeRound = loadedRounds.find(
            (r: RoundInfo) => r.status === "ACTIVE"
          );
          if (activeRound) {
            // Раунд уже идёт — восстанавливаем фазу
            setCurrentRound(activeRound.roundNumber);
            setCurrentRoundId(activeRound.id);
            setPhase("ROUND_ACTIVE");
          } else {
            // Нет активного раунда — следующий раунд
            setPhase("ROUND_READY");
          }
        } else {
          setPhase("ROUND_READY");
        }
      } catch {
        setError("Ошибка загрузки игры");
      }
    }
    fetchGame();
  }, [gameId]);

  // =============================================
  // Присоединение к комнате
  // =============================================
  useEffect(() => {
    if (!isConnected || !game || !userId || !session?.user?.name) return;

    if (isHost) {
      // Хост пересоздаёт комнату (важно после рестарта сокет-сервера)
      emit("create_game", {
        gameId: game.id,
        code: game.code,
        userId,
        name: session.user.name,
      });
    } else {
      emit("join_game", {
        code: game.code,
        userId,
        name: session.user.name,
      });
    }
  }, [isConnected, game, userId, session, isHost, emit]);

  // =============================================
  // Socket.io события
  // =============================================
  useEffect(() => {
    if (!isConnected) return;

    // Раунд начался (для участников)
    const unsubRoundStarted = on("round_started", (data: unknown) => {
      const { roundNumber, roundId } = data as {
        roundNumber: number;
        roundId: string;
        totalRounds: number;
      };
      setCurrentRound(roundNumber);
      setCurrentRoundId(roundId);
      setGuessCount(0);
      setRoundResult(null);
      setPhase("ROUND_ACTIVE");
    });

    // Обновление количества догадок (для хоста)
    const unsubGuessUpdate = on("guess_update", (data: unknown) => {
      const { guessCount: count, totalPlayers: total } = data as {
        roundId: string;
        guessCount: number;
        totalPlayers: number;
        playerName: string;
      };
      setGuessCount(count);
      setTotalPlayers(total);
    });

    // Догадка принята (для участника)
    const unsubGuessReceived = on("guess_received", () => {
      setPhase("GUESS_SUBMITTED");
      setSubmitting(false);
    });

    // Результаты раунда
    const unsubRoundResults = on("round_results", (data: unknown) => {
      setRoundResult(data as RoundResultData);
      setPhase("ROUND_RESULTS");
    });

    // Игра завершена
    const unsubGameFinished = on("game_finished", (data: unknown) => {
      const { rankings: r } = data as { rankings: Ranking[] };
      setRankings(r);
      setPhase("GAME_FINISHED");
    });

    // Хост временно отключился
    const unsubHostDisconnected = on("host_temporarily_disconnected", (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
    });

    // Хост вернулся
    const unsubHostReconnected = on("host_reconnected", () => {
      setError(null);
    });

    // Ошибки
    const unsubError = on("error", (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
      setSubmitting(false);
    });

    return () => {
      unsubRoundStarted();
      unsubGuessUpdate();
      unsubGuessReceived();
      unsubRoundResults();
      unsubGameFinished();
      unsubHostDisconnected();
      unsubHostReconnected();
      unsubError();
    };
  }, [isConnected, on]);

  // =============================================
  // Обработчики действий
  // =============================================

  // Хост: Запустить раунд (раунд уже заполнен в лобби)
  const handleActivateRound = useCallback(() => {
    if (!game) return;

    // Находим раунд по номеру
    const round = rounds.find((r) => r.roundNumber === currentRound);
    if (!round) {
      setError("Раунд не найден");
      return;
    }

    setCurrentRoundId(round.id);

    // Уведомляем всех через Socket.io
    emit("activate_round", {
      code: game.code,
      roundId: round.id,
      roundNumber: currentRound,
    });

    setPhase("ROUND_ACTIVE");
    setGuessCount(0);
  }, [game, currentRound, rounds, emit]);

  // Участник: Отправить догадку
  const handleSubmitGuess = useCallback(() => {
    if (!game || !userId || !currentRoundId) return;
    setSubmitting(true);

    // Собираем все значения из localStorage
    const guessParams: WineParams = {
      color: localStorage.getItem(`wine-guess-${gameId}-color`) || "",
      sweetness: localStorage.getItem(`wine-guess-${gameId}-sweetness`) || "",
      composition: localStorage.getItem(`wine-guess-${gameId}-composition`) || "",
      country: localStorage.getItem(`wine-guess-${gameId}-country`) || "",
      vintageYear: localStorage.getItem(`wine-guess-${gameId}-vintageYear`) || "",
      alcoholContent: localStorage.getItem(`wine-guess-${gameId}-alcoholContent`) || "",
      grapeVarieties: JSON.parse(localStorage.getItem(`wine-guess-${gameId}-grapeVarieties`) || "[]"),
      isOakAged: (() => {
        const saved = localStorage.getItem(`wine-guess-${gameId}-isOakAged`);
        if (saved === null) return null;
        return saved === "true";
      })(),
    };

    emit("submit_guess", {
      code: game.code,
      roundId: currentRoundId,
      userId,
      guess: {
        grapeVarieties: guessParams.grapeVarieties,
        sweetness: guessParams.sweetness || null,
        vintageYear: guessParams.vintageYear ? parseInt(guessParams.vintageYear) : null,
        country: guessParams.country || null,
        alcoholContent: guessParams.alcoholContent
          ? parseFloat(guessParams.alcoholContent)
          : null,
        isOakAged: guessParams.isOakAged,
        color: guessParams.color || null,
        composition: guessParams.composition || null,
      },
    });
  }, [game, userId, currentRoundId, gameId, emit]);

  // Хост: Закрыть раунд
  const handleCloseRound = useCallback(() => {
    if (!game || !currentRoundId) return;
    emit("close_round", { code: game.code, roundId: currentRoundId });
  }, [game, currentRoundId, emit]);

  // Хост: Следующий раунд
  const handleNextRound = useCallback(() => {
    setCurrentRound((prev) => prev + 1);
    setCurrentRoundId(null);
    setRoundResult(null);
    setGuessCount(0);
    setPhase("ROUND_READY");
  }, []);

  // Хост: Завершить игру
  const handleFinishGame = useCallback(() => {
    if (!game) return;
    emit("finish_game", { code: game.code });
  }, [game, emit]);

  // =============================================
  // Рендеринг
  // =============================================

  if (phase === "LOADING") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍷</div>
          <p className="text-[var(--muted-foreground)]">Загрузка игры...</p>
        </div>
      </main>
    );
  }

  if (error && !game) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-xl text-[var(--error)]">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl"
          >
            На главную
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center pb-8">
      {/* === Верхняя панель === */}
      <div className="w-full sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-[var(--muted-foreground)]">
              {game?.code}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[var(--success)]" : "bg-[var(--error)]"
              }`}
            />
          </div>
          <div className="text-sm font-bold text-[var(--primary)]">
            {phase !== "GAME_FINISHED"
              ? `Раунд ${currentRound}/${game?.totalRounds || "?"}`
              : "Игра завершена"}
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <span className="text-xs bg-[var(--secondary)] text-[var(--secondary-foreground)] px-2 py-0.5 rounded-full">
                Хост
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* === Ошибка === */}
      {error && (
        <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <div className="bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-4 py-2 rounded-xl text-sm text-center">
            {error}
          </div>
        </div>
      )}

      {/* === Основной контент === */}
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
        {/* ──────────── ROUND_READY (Хост) ──────────── */}
        {phase === "ROUND_READY" && isHost && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl mb-4">🍷</div>
            <h2 className="text-xl font-bold">Раунд {currentRound}</h2>
            <p className="text-[var(--muted-foreground)]">
              Вино уже загадано. Запустите раунд, когда все будут готовы!
            </p>

            <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)] text-sm text-[var(--muted-foreground)]">
              <p>👥 Игроков: {totalPlayers}</p>
            </div>

            <button
              onClick={handleActivateRound}
              className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
            >
              ▶️ Запустить раунд {currentRound}
            </button>
          </div>
        )}

        {/* ROUND_READY (Участник ждёт) */}
        {phase === "ROUND_READY" && !isHost && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-pulse">🍷</div>
            <h2 className="text-xl font-bold mb-2">Ожидание...</h2>
            <p className="text-[var(--muted-foreground)]">
              Хост готовит раунд {currentRound}
            </p>
          </div>
        )}

        {/* ──────────── ROUND_ACTIVE (Хост ждёт ответы) ──────────── */}
        {phase === "ROUND_ACTIVE" && isHost && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-xl font-bold">Участники угадывают...</h2>
            <div className="bg-[var(--card)] rounded-2xl p-6 shadow border border-[var(--border)]">
              <div className="text-4xl font-bold text-[var(--primary)]">
                {guessCount} / {totalPlayers > 0 ? totalPlayers - 1 : "?"}
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Ответов получено
              </p>
            </div>
            <button
              onClick={handleCloseRound}
              className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
            >
              📊 Закрыть раунд и показать результаты
            </button>
          </div>
        )}

        {/* ROUND_ACTIVE (Участник заполняет форму) */}
        {phase === "ROUND_ACTIVE" && !isHost && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">🤔 Угадайте вино!</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Раунд {currentRound}/{game?.totalRounds}
              </p>
            </div>

            <CharacteristicCards gameId={gameId} values={guessValues} />
            
            <button
              onClick={handleSubmitGuess}
              disabled={submitting}
              className="w-full mt-6 px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Отправка...
                </span>
              ) : (
                "✅ Отправить ответ"
              )}
            </button>
          </div>
        )}

        {/* ──────────── GUESS_SUBMITTED ──────────── */}
        {phase === "GUESS_SUBMITTED" && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2">Ответ отправлен!</h2>
            <p className="text-[var(--muted-foreground)]">
              Ожидайте, пока хост закроет раунд...
            </p>
          </div>
        )}

        {/* ──────────── ROUND_RESULTS ──────────── */}
        {phase === "ROUND_RESULTS" && roundResult && (
          <div className="space-y-6">
            <RoundResults
              roundNumber={roundResult.roundNumber}
              totalRounds={roundResult.totalRounds}
              correctAnswer={roundResult.correctAnswer}
              photos={roundResult.photos}
              results={roundResult.results}
              currentUserId={userId}
            />

            {/* Кнопки навигации (только хост) */}
            {isHost && (
              <div className="space-y-3">
                {currentRound < (game?.totalRounds || 0) ? (
                  <button
                    onClick={handleNextRound}
                    className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
                  >
                    ➡️ Следующий раунд ({currentRound + 1}/{game?.totalRounds})
                  </button>
                ) : (
                  <button
                    onClick={handleFinishGame}
                    className="w-full px-6 py-4 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
                  >
                    🏁 Завершить игру
                  </button>
                )}
              </div>
            )}

            {/* Участник ждёт */}
            {!isHost && (
              <div className="text-center text-[var(--muted-foreground)] text-sm">
                <span className="animate-pulse">⏳</span>{" "}
                {currentRound < (game?.totalRounds || 0)
                  ? "Ожидание следующего раунда..."
                  : "Ожидание завершения игры..."}
              </div>
            )}
          </div>
        )}

        {/* ──────────── GAME_FINISHED ──────────── */}
        {phase === "GAME_FINISHED" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold">Игра завершена!</h2>
            </div>

            {/* Итоговый рейтинг */}
            <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
              <h3 className="text-lg font-bold mb-4 text-center">Итоговый рейтинг</h3>
              <div className="space-y-3">
                {rankings.map((player) => {
                  const isCurrentUser = player.userId === userId;
                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        isCurrentUser
                          ? "bg-[var(--primary)] bg-opacity-10 border border-[var(--primary)]"
                          : "bg-[var(--muted)]"
                      }`}
                    >
                      <span className="text-2xl font-bold min-w-[40px] text-center">
                        {player.position === 1
                          ? "🥇"
                          : player.position === 2
                          ? "🥈"
                          : player.position === 3
                          ? "🥉"
                          : `${player.position}.`}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {player.name}
                          {isCurrentUser && " (вы)"}
                        </p>
                      </div>
                      <span className="text-xl font-bold text-[var(--primary)]">
                        {player.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
            >
              🏠 На главную
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
