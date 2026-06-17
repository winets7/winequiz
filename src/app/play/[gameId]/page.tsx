"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useHierarchicalBack } from "@/hooks/useHierarchicalBack";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WineForm, WineParams } from "@/components/game/wine-form";
import { RoundResults } from "@/components/game/round-results";
import { CharacteristicCards } from "@/components/game/characteristic-cards";
import {
  getActivePlayRoundNumber,
  isWineGuessDraftEmpty,
  isWineGuessStorageKey,
  prepareWineGuessStorageForRound,
  readWineGuessFromLocalStorage,
  writeWineGuessToLocalStorage,
} from "@/lib/wine-guess-storage";

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
  guesses?: Array<{
    grapeVarieties: string[];
    sweetness: string | null;
    vintageYear: number | null;
    country: string | null;
    alcoholContent: number | null;
    isOakAged: boolean | null;
    color: string | null;
    composition: string | null;
    submittedAt: string;
  }>;
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

type SubmittedGuessSnapshot = {
  grapeVarieties: string[];
  sweetness: string;
  vintageYear: string;
  country: string;
  alcoholContent: string;
  isOakAged: boolean | null;
  color: string;
  composition: string;
};

function normalizeGuessValues(values: Partial<WineParams>): SubmittedGuessSnapshot {
  return {
    grapeVarieties: (values.grapeVarieties ?? []).map((g) => String(g).trim()),
    sweetness: String(values.sweetness ?? ""),
    vintageYear: String(values.vintageYear ?? ""),
    country: String(values.country ?? ""),
    alcoholContent: String(values.alcoholContent ?? ""),
    isOakAged:
      values.isOakAged === undefined || values.isOakAged === null
        ? null
        : Boolean(values.isOakAged),
    color: String(values.color ?? ""),
    composition: String(values.composition ?? ""),
  };
}

function serverGuessToWineParams(guess: {
  grapeVarieties: string[];
  sweetness: string | null;
  vintageYear: number | null;
  country: string | null;
  alcoholContent: number | null;
  isOakAged: boolean | null;
  color: string | null;
  composition: string | null;
}): Partial<WineParams> {
  return {
    grapeVarieties: guess.grapeVarieties ?? [],
    sweetness: guess.sweetness ?? "",
    vintageYear: guess.vintageYear == null ? "" : String(guess.vintageYear),
    country: guess.country ?? "",
    alcoholContent: guess.alcoholContent == null ? "" : String(guess.alcoholContent),
    isOakAged: guess.isOakAged,
    color: guess.color ?? "",
    composition: guess.composition ?? "",
  };
}

function normalizeServerGuess(guess: {
  grapeVarieties: string[];
  sweetness: string | null;
  vintageYear: number | null;
  country: string | null;
  alcoholContent: number | null;
  isOakAged: boolean | null;
  color: string | null;
  composition: string | null;
}): SubmittedGuessSnapshot {
  return {
    grapeVarieties: (guess.grapeVarieties ?? []).map((g) => String(g).trim()),
    sweetness: String(guess.sweetness ?? ""),
    vintageYear: guess.vintageYear == null ? "" : String(guess.vintageYear),
    country: String(guess.country ?? ""),
    alcoholContent: guess.alcoholContent == null ? "" : String(guess.alcoholContent),
    isOakAged:
      guess.isOakAged === undefined || guess.isOakAged === null
        ? null
        : Boolean(guess.isOakAged),
    color: String(guess.color ?? ""),
    composition: String(guess.composition ?? ""),
  };
}

function areGuessesEqual(a: SubmittedGuessSnapshot, b: SubmittedGuessSnapshot): boolean {
  if (
    a.sweetness !== b.sweetness ||
    a.country !== b.country ||
    a.color !== b.color ||
    a.composition !== b.composition ||
    a.isOakAged !== b.isOakAged
  ) {
    return false;
  }

  const aVintage = a.vintageYear.trim() === "" ? null : Number(a.vintageYear);
  const bVintage = b.vintageYear.trim() === "" ? null : Number(b.vintageYear);
  if (aVintage !== bVintage) return false;

  const aAlcohol = a.alcoholContent.trim() === "" ? null : Number(a.alcoholContent);
  const bAlcohol = b.alcoholContent.trim() === "" ? null : Number(b.alcoholContent);
  if (aAlcohol !== bAlcohol) return false;

  if (a.grapeVarieties.length !== b.grapeVarieties.length) return false;
  for (let i = 0; i < a.grapeVarieties.length; i += 1) {
    if (a.grapeVarieties[i] !== b.grapeVarieties[i]) return false;
  }

  return true;
}

/** Фон страницы ответов участника и подложка сетки карточек (как join / wine-quiz). */
const PLAY_PAGE_FON_BG =
  "bg-[url('/pic/fon.png')] bg-cover bg-center bg-no-repeat";

/**
 * После гидрации с сервера: не затираем черновик в localStorage, если пользователь
 * уже менял поля (например, цвет) до повторной отправки.
 */
function resolveGuessAfterServerHydrate(
  gameId: string,
  roundNumber: number,
  submittedSnapshot: SubmittedGuessSnapshot,
  serverWineParams: Partial<WineParams>
): { values: Partial<WineParams>; writeServerToLocalStorage: boolean } {
  const fromLocal = readWineGuessFromLocalStorage(gameId, roundNumber);
  const localNorm = normalizeGuessValues(fromLocal);
  const hasMeaningfulLocal =
    !isWineGuessDraftEmpty(fromLocal) && !areGuessesEqual(localNorm, submittedSnapshot);
  if (hasMeaningfulLocal) {
    return { values: fromLocal, writeServerToLocalStorage: false };
  }
  return { values: serverWineParams, writeServerToLocalStorage: true };
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
  const [submittedGuess, setSubmittedGuess] = useState<SubmittedGuessSnapshot | null>(null);

  const gameRef = useRef(game);
  gameRef.current = game;

  const userId = session?.user?.id;
  const isHost = game?.host?.id === userId;
  // «Назад» ведёт на главную викторины; подмена истории нужна, чтобы при «Назад» во время LOADING не уйти на предыдущую запись.
  const goBack = useHierarchicalBack("/games/wine-quiz");

  // =============================================
  // Загрузка сохраненных значений из localStorage
  // =============================================
  const loadSavedValues = useCallback(() => {
    if (!gameId || currentRound < 1) return;
    setGuessValues(readWineGuessFromLocalStorage(gameId, currentRound));
  }, [gameId, currentRound]);

  const saveGuessValuesToLocalStorage = useCallback(
    (values: Partial<WineParams>, roundNumber: number = currentRound) => {
      if (!gameId || roundNumber < 1) return;
      writeWineGuessToLocalStorage(gameId, roundNumber, values);
    },
    [gameId, currentRound]
  );

  useEffect(() => {
    if (!gameId || !userId) return;
    
    loadSavedValues();
    
    // Слушаем изменения в localStorage (для синхронизации между вкладками и страницами)
    const handleStorageChange = (e: StorageEvent) => {
      if (isWineGuessStorageKey(e.key, gameId, currentRound)) {
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
  }, [gameId, userId, currentRound, loadSavedValues]);

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
        const roundsRes = await fetch(
          `/api/rounds?gameId=${gameId}${userId ? `&userId=${userId}` : ""}`
        );
        if (roundsRes.ok) {
          const roundsData = await roundsRes.json();
          loadedRounds = (roundsData.rounds || []).map((r: RoundInfo) => ({
            id: r.id,
            roundNumber: r.roundNumber,
            status: r.status,
            color: r.color,
            country: r.country,
            grapeVarieties: r.grapeVarieties,
            guesses: r.guesses,
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
            prepareWineGuessStorageForRound(gameId, activeRound.roundNumber);
            const existingGuess = activeRound.guesses?.[0] ?? null;
            if (existingGuess) {
              const normalized = normalizeServerGuess(existingGuess);
              const asWineParams = serverGuessToWineParams(existingGuess);
              setSubmittedGuess(normalized);
              const resolved = resolveGuessAfterServerHydrate(
                gameId,
                activeRound.roundNumber,
                normalized,
                asWineParams
              );
              setGuessValues(resolved.values);
              if (resolved.writeServerToLocalStorage) {
                saveGuessValuesToLocalStorage(asWineParams, activeRound.roundNumber);
              }
            } else {
              setSubmittedGuess(null);
              setGuessValues(
                readWineGuessFromLocalStorage(gameId, activeRound.roundNumber)
              );
            }
            setPhase("ROUND_ACTIVE");
          } else {
            // Нет активного раунда — следующий раунд
            setSubmittedGuess(null);
            setPhase("ROUND_READY");
          }
        } else {
          setSubmittedGuess(null);
          setPhase("ROUND_READY");
        }
      } catch {
        setError("Ошибка загрузки игры");
      }
    }
    fetchGame();
  }, [gameId, userId, saveGuessValuesToLocalStorage]);

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
      setSubmittedGuess(null);
      prepareWineGuessStorageForRound(gameId, roundNumber);
      setGuessValues(readWineGuessFromLocalStorage(gameId, roundNumber));
      setPhase("ROUND_ACTIVE");

      // При старте/восстановлении раунда подтягиваем ответ с сервера, чтобы
      // синхронизировать состояние между разными устройствами одного игрока.
      (async () => {
        try {
          const roundsRes = await fetch(`/api/rounds?gameId=${gameId}`);
          if (!roundsRes.ok) return;
          const roundsData = await roundsRes.json();
          const active = (roundsData.rounds || []).find(
            (r: RoundInfo) => r.id === roundId || r.roundNumber === roundNumber
          ) as RoundInfo | undefined;
          const existingGuess = active?.guesses?.[0] ?? null;
          if (!existingGuess) return;
          const normalized = normalizeServerGuess(existingGuess);
          const asWineParams = serverGuessToWineParams(existingGuess);
          setSubmittedGuess(normalized);
          const resolved = resolveGuessAfterServerHydrate(
            gameId,
            roundNumber,
            normalized,
            asWineParams
          );
          setGuessValues(resolved.values);
          if (resolved.writeServerToLocalStorage) {
            saveGuessValuesToLocalStorage(asWineParams, roundNumber);
          }
        } catch {
          // Молча игнорируем: базовый UX уже обеспечен локальным состоянием.
        }
      })();
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
      const round = getActivePlayRoundNumber(gameId);
      setSubmittedGuess(
        normalizeGuessValues(readWineGuessFromLocalStorage(gameId, round))
      );
      setSubmitting(false);
    });

    // Результаты раунда
    const unsubRoundResults = on("round_results", (data: unknown) => {
      setRoundResult(data as RoundResultData);
      setPhase("ROUND_RESULTS");
      setSubmittedGuess(null);
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

    // Ошибки (не показываем «Ожидайте, пока хост начнёт игру», если игра уже идёт по данным API)
    const unsubError = on("error", (data: unknown) => {
      const { message } = data as { message: string };
      if (
        message === "Ожидайте, пока хост начнёт игру" &&
        gameRef.current?.status === "PLAYING"
      ) {
        setError(null);
      } else {
        setError(message);
      }
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
  }, [isConnected, on, gameId, saveGuessValuesToLocalStorage, currentRound]);

  const currentGuessSnapshot = normalizeGuessValues(guessValues);
  const isSubmittedGuessUnchanged =
    submittedGuess !== null && areGuessesEqual(currentGuessSnapshot, submittedGuess);
  const showResubmitHint = submittedGuess !== null && !isSubmittedGuessUnchanged;
  const submitButtonDisabled = submitting || isSubmittedGuessUnchanged;
  const submitButtonLabel = isSubmittedGuessUnchanged
    ? "Ответ отправлен"
    : "✅ Отправить ответ";

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
    prepareWineGuessStorageForRound(game.id, currentRound);

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

    const stored = readWineGuessFromLocalStorage(gameId, currentRound);
    const guessParams: WineParams = {
      color: stored.color ?? "",
      sweetness: stored.sweetness ?? "",
      composition: stored.composition ?? "",
      country: stored.country ?? "",
      vintageYear: stored.vintageYear ?? "",
      alcoholContent: stored.alcoholContent ?? "",
      grapeVarieties: stored.grapeVarieties ?? [],
      isOakAged: stored.isOakAged ?? null,
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
  }, [game, userId, currentRoundId, currentRound, gameId, emit]);

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
            onClick={goBack}
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl"
          >
            В профиль
          </button>
        </div>
      </main>
    );
  }

  const participantAnswerGarden =
    !isHost && (phase === "ROUND_ACTIVE" || phase === "GUESS_SUBMITTED");

  return (
    <main
      className={`flex h-dvh min-h-0 flex-col items-center overflow-y-auto pb-8${
        participantAnswerGarden ? ` ${PLAY_PAGE_FON_BG}` : ""
      }`}
    >
      {/* === Верхняя панель === */}
      <div
        className={`w-full sticky top-0 z-10 border-b border-[var(--border)] ${
          participantAnswerGarden
            ? "bg-[var(--background)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/65"
            : "bg-[var(--background)]"
        }`}
      >
        <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              className="text-[var(--foreground)] hover:opacity-70 transition-opacity p-1 -ml-1"
              title="В профиль"
            >
              ←
            </button>
            <span className="text-sm font-mono text-[var(--muted-foreground)]">
              {game?.code}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[var(--success)]" : "bg-[var(--error)]"
              }`}
            />
          </div>
          <div className="min-w-[4.5rem] text-center text-sm font-bold text-[var(--primary)]">
            {phase === "GAME_FINISHED"
              ? "Игра завершена"
              : !participantAnswerGarden
                ? `Раунд ${currentRound}/${game?.totalRounds || "?"}`
                : null}
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <>
                <button
                  onClick={() => window.open(`/scoreboard/${gameId}`, '_blank')}
                  className="text-sm bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-bold flex items-center gap-2 shadow-md"
                  title="Открыть scoreboard для трансляции"
                >
                  📊 Scoreboard
                </button>
                <span className="text-xs bg-[var(--secondary)] text-[var(--secondary-foreground)] px-2 py-0.5 rounded-full">
                  Хост
                </span>
              </>
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
      <div className="flex min-h-0 w-full max-w-lg flex-1 flex-col sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
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
                {guessCount} / {totalPlayers > 0 ? totalPlayers : "?"}
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
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0">
              <div className="flex items-start gap-2 sm:gap-3">
                {game?.code ? (
                  <Link
                    href={`/join/${game.code}`}
                    className="flex w-[4.25rem] shrink-0 flex-col items-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] sm:w-[4.75rem]"
                    title="Вернуться на страницу игры"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105 sm:h-11 sm:w-11">
                      <svg
                        viewBox="0 0 64 64"
                        className="h-10 w-10 sm:h-11 sm:w-11"
                        aria-hidden="true"
                      >
                        <defs>
                          <radialGradient
                            id="playJoinBackOuterMetal"
                            cx="32%"
                            cy="28%"
                            r="72%"
                          >
                            <stop offset="0%" stopColor="#f7f7f7" />
                            <stop offset="55%" stopColor="#d6d6d6" />
                            <stop offset="100%" stopColor="#a8a8a8" />
                          </radialGradient>
                          <radialGradient
                            id="playJoinBackInnerRed"
                            cx="34%"
                            cy="26%"
                            r="74%"
                          >
                            <stop offset="0%" stopColor="#d43d3d" />
                            <stop offset="65%" stopColor="#a20f16" />
                            <stop offset="100%" stopColor="#7a070c" />
                          </radialGradient>
                        </defs>
                        <circle
                          cx="32"
                          cy="32"
                          r="31"
                          fill="url(#playJoinBackOuterMetal)"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="23"
                          fill="url(#playJoinBackInnerRed)"
                        />
                        <path
                          d="M37 17 21 32l16 15v-9c8.5 0 12.5 4.7 14 10-0.2-11.5-3.9-21-14-21z"
                          fill="#fff"
                        />
                      </svg>
                    </span>
                    <span className="mt-0.5 text-center text-[10px] font-medium leading-tight sm:text-[11px]">
                      К странице игры
                    </span>
                  </Link>
                ) : (
                  <div
                    className="w-[4.25rem] shrink-0 sm:w-[4.75rem]"
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1 pt-0.5 text-center">
                  <h1 className="wine-quiz-page-title text-xl font-bold sm:text-2xl md:text-3xl">
                    🤔 Угадайте вино!
                  </h1>
                  <p className="wine-quiz-round-label mt-1">
                    Раунд {currentRound}/{game?.totalRounds}
                  </p>
                </div>
                <div
                  className="w-[4.25rem] shrink-0 sm:w-[4.75rem]"
                  aria-hidden
                />
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl ring-2 ring-black/15 shadow-lg dark:ring-white/20">
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 ${PLAY_PAGE_FON_BG}`}
              />
              <div className="relative z-[1] min-h-0 h-full p-1 sm:p-2">
                <CharacteristicCards gameId={gameId} values={guessValues} className="h-full" />
              </div>
            </div>

            {showResubmitHint && (
              <div className="shrink-0 rounded-xl border border-[var(--primary)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)]">
                Вы изменили ранее отправленный ответ. Для его сохранения в игре отправьте ответ повторно.
              </div>
            )}

            <button
              onClick={handleSubmitGuess}
              disabled={submitButtonDisabled}
              className={`w-full shrink-0 px-6 py-4 rounded-2xl text-lg font-bold transition-opacity shadow-lg disabled:cursor-not-allowed ${
                isSubmittedGuessUnchanged
                  ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Отправка...
                </span>
              ) : (
                submitButtonLabel
              )}
            </button>
          </div>
        )}

        {/* ──────────── GUESS_SUBMITTED ──────────── */}
        {phase === "GUESS_SUBMITTED" && (
          <div className="space-y-6 py-16 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="wine-quiz-page-title text-4xl font-bold md:text-6xl">
              Ответ отправлен!
            </h1>
            <p className="mt-2 font-medium text-[var(--foreground)]">
              Ожидайте, пока хост закроет раунд...
            </p>
            {game?.code && (
              <Link
                href={`/join/${game.code}`}
                className="inline-flex w-full max-w-sm mx-auto justify-center px-6 py-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-bold hover:bg-[var(--muted)] transition-colors"
              >
                Вернуться к игре
              </Link>
            )}
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
                <button
                  onClick={() => window.open(`/scoreboard/${gameId}`, '_blank')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#DAA520] to-[#C4941A] text-[#3D0F1E] rounded-2xl text-base font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2"
                >
                  📊 Открыть Scoreboard для трансляции
                </button>
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

            {/* Кнопки для хоста */}
            {isHost && (
              <button
                onClick={() => window.open(`/scoreboard/${gameId}`, '_blank')}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#DAA520] to-[#C4941A] text-[#3D0F1E] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2"
              >
                📊 Открыть Scoreboard для трансляции
              </button>
            )}

            <button
              onClick={goBack}
              className="w-full px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
            >
              👤 В профиль
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
