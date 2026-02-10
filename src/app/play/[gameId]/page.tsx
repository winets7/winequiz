"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WineForm, WineParams } from "@/components/game/wine-form";
import { RoundResults } from "@/components/game/round-results";

// =============================================
// Типы
// =============================================

type GamePhase =
  | "LOADING"
  | "ROUND_SETUP"     // Хост настраивает раунд
  | "ROUND_ACTIVE"    // Участники угадывают
  | "GUESS_SUBMITTED" // Участник отправил догадку
  | "ROUND_RESULTS"   // Результаты раунда
  | "GAME_FINISHED";  // Игра завершена

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
  const [guessCount, setGuessCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Фото для загрузки (только хост)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id;
  const isHost = game?.host?.id === userId;

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

        // Определяем начальную фазу
        if (g.status === "FINISHED") {
          setPhase("GAME_FINISHED");
        } else if (g.status === "PLAYING") {
          setPhase("ROUND_SETUP");
        } else {
          setPhase("ROUND_SETUP");
        }
      } catch {
        setError("Ошибка загрузки игры");
      }
    }
    fetchGame();
  }, [gameId]);

  // =============================================
  // Присоединение к комнате при подключении сокета
  // =============================================
  useEffect(() => {
    if (!isConnected || !game || !userId || !session?.user?.name) return;

    // Пере-присоединяемся к комнате
    emit("join_game", {
      code: game.code,
      userId,
      name: session.user.name,
    });
  }, [isConnected, game, userId, session, emit]);

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
      unsubError();
    };
  }, [isConnected, on]);

  // =============================================
  // Обработчики действий
  // =============================================

  // Хост: Создать раунд и начать
  const handleStartRound = useCallback(
    async (wineParams: WineParams) => {
      if (!game) return;
      setSubmitting(true);
      setError(null);

      try {
        // 1. Создаём раунд через REST API
        const roundRes = await fetch("/api/rounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            roundNumber: currentRound,
            ...wineParams,
            vintageYear: wineParams.vintageYear ? parseInt(wineParams.vintageYear) : null,
            alcoholContent: wineParams.alcoholContent ? parseFloat(wineParams.alcoholContent) : null,
          }),
        });

        if (!roundRes.ok) {
          const data = await roundRes.json();
          setError(data.error || "Ошибка создания раунда");
          setSubmitting(false);
          return;
        }

        const { round } = await roundRes.json();
        setCurrentRoundId(round.id);

        // 2. Загружаем фотографии если есть
        if (selectedPhotos.length > 0) {
          const formData = new FormData();
          selectedPhotos.forEach((photo) => {
            formData.append("photos", photo);
          });

          await fetch(`/api/rounds/${round.id}/photos`, {
            method: "POST",
            body: formData,
          });
        }

        // 3. Уведомляем всех через Socket.io
        emit("activate_round", {
          code: game.code,
          roundId: round.id,
          roundNumber: currentRound,
        });

        // Хост переходит в режим ожидания
        setPhase("ROUND_ACTIVE");
        setGuessCount(0);
        setSelectedPhotos([]);
        setPhotoPreviewUrls([]);
        setSubmitting(false);
      } catch {
        setError("Ошибка при создании раунда");
        setSubmitting(false);
      }
    },
    [game, currentRound, selectedPhotos, emit]
  );

  // Участник: Отправить догадку
  const handleSubmitGuess = useCallback(
    (guessParams: WineParams) => {
      if (!game || !userId || !currentRoundId) return;
      setSubmitting(true);

      emit("submit_guess", {
        code: game.code,
        roundId: currentRoundId,
        userId,
        guess: {
          grapeVarieties: guessParams.grapeVarieties,
          sweetness: guessParams.sweetness || null,
          vintageYear: guessParams.vintageYear ? parseInt(guessParams.vintageYear) : null,
          country: guessParams.country || null,
          alcoholContent: guessParams.alcoholContent ? parseFloat(guessParams.alcoholContent) : null,
          isOakAged: guessParams.isOakAged,
          color: guessParams.color || null,
          composition: guessParams.composition || null,
        },
      });
    },
    [game, userId, currentRoundId, emit]
  );

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
    setPhase("ROUND_SETUP");
  }, []);

  // Хост: Завершить игру
  const handleFinishGame = useCallback(() => {
    if (!game) return;
    emit("finish_game", { code: game.code });
  }, [game, emit]);

  // Обработка фотографий
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = selectedPhotos.length + files.length;

    if (totalPhotos > 4) {
      setError("Максимум 4 фотографии");
      return;
    }

    setSelectedPhotos((prev) => [...prev, ...files]);

    // Создаём превью
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrls((prev) => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

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
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
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
        <div className="w-full max-w-lg mx-auto px-4 mt-4">
          <div className="bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-4 py-2 rounded-xl text-sm text-center">
            {error}
          </div>
        </div>
      )}

      {/* === Основной контент === */}
      <div className="w-full max-w-lg mx-auto px-4 mt-4">
        {/* ──────────── ROUND_SETUP ──────────── */}
        {phase === "ROUND_SETUP" && isHost && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">🍷 Настройте раунд {currentRound}</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Введите параметры загаданного вина
              </p>
            </div>

            {/* Загрузка фото */}
            <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                📸 Фотографии бутылки (до 4 шт.)
              </label>

              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--muted)]">
                      <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-[var(--error)] text-white rounded-full text-xs flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedPhotos.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  📷 Добавить фото
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Форма параметров вина */}
            <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
              <WineForm
                mode="host"
                onSubmit={handleStartRound}
                loading={submitting}
                submitLabel="🍷 Начать раунд"
              />
            </div>
          </div>
        )}

        {phase === "ROUND_SETUP" && !isHost && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-pulse">🍷</div>
            <h2 className="text-xl font-bold mb-2">Ожидание хоста...</h2>
            <p className="text-[var(--muted-foreground)]">
              Хост готовит раунд {currentRound}
            </p>
          </div>
        )}

        {/* ──────────── ROUND_ACTIVE ──────────── */}
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

        {phase === "ROUND_ACTIVE" && !isHost && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">🤔 Угадайте вино!</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Раунд {currentRound}/{game?.totalRounds}
              </p>
            </div>

            <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
              <WineForm
                mode="player"
                onSubmit={handleSubmitGuess}
                loading={submitting}
                submitLabel="✅ Отправить ответ"
              />
            </div>
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
