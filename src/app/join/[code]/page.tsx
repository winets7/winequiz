"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { isValidGameCode } from "@/lib/game-code";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PlayerRoundsList } from "@/components/game/player-rounds-list";

interface Player {
  userId: string;
  name: string;
}

interface GameData {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  maxPlayers: number;
}

interface RoundData {
  id: string;
  roundNumber: number;
  status: string;
  color: string | null;
  country: string | null;
  vintageYear: number | null;
  grapeVarieties: string[];
}

/** Панели лобби участника — см. `.cursor/rules/wine-quiz-active-game-cards.mdc` */
const joinParticipantPanel =
  "rounded-3xl border-4 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)] shadow-lg";

const joinPageMainBg =
  "bg-[url('/pic/fon.png')] bg-cover bg-center bg-no-repeat";

const joinMainPanelFrame =
  "rounded-3xl shadow-xl border-4 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg)]";

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;
  const { data: session, status: sessionStatus } = useSession();

  const { isConnected, emit, on } = useSocket();

  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState<GameData | null>(null);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [checkingExistingPlayer, setCheckingExistingPlayer] = useState(false);
  const [playersExpanded, setPlayersExpanded] = useState(false);

  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? "Игрок";

  const sortedPlayers = useMemo(() => {
    if (!userId) return players;
    const self = players.find((p) => p.userId === userId);
    const rest = players.filter((p) => p.userId !== userId);
    return self ? [self, ...rest] : players;
  }, [players, userId]);

  const autoRejoinLookupDone = useRef(false);
  const pendingAutoSocketJoin = useRef(false);
  const autoRejoinInFlight = useRef(false);

  // Повторная проверка при смене комнаты или пользователя
  useEffect(() => {
    autoRejoinLookupDone.current = false;
    pendingAutoSocketJoin.current = false;
    autoRejoinInFlight.current = false;
  }, [code, userId]);

  // Валидация кода при загрузке
  useEffect(() => {
    if (!isValidGameCode(code)) {
      setError("Неверный код комнаты");
    }
  }, [code]);

  // Уже в игре в БД — сразу лобби (возврат по /join/... без кнопки).
  // useLayoutEffect: помечаем «проверку» до paint — без мигания карточки «Присоединиться».
  useLayoutEffect(() => {
    if (!userId || !code || !isValidGameCode(code)) return;
    if (autoRejoinLookupDone.current || autoRejoinInFlight.current) return;

    let cancelled = false;
    autoRejoinInFlight.current = true;
    setCheckingExistingPlayer(true);

    async function tryAutoRejoin() {
      try {
        const res = await fetch(`/api/games?code=${encodeURIComponent(code)}`);
        if (!res.ok || cancelled) {
          if (!cancelled) autoRejoinLookupDone.current = true;
          return;
        }
        const data = await res.json();
        const g = data.game as {
          id: string;
          players?: Array<{ userId: string; user?: { name?: string | null } }>;
        };
        if (!g?.id || cancelled) {
          if (!cancelled) autoRejoinLookupDone.current = true;
          return;
        }

        const isPlayer = (g.players ?? []).some((p) => p.userId === userId);
        if (!isPlayer) {
          autoRejoinLookupDone.current = true;
          return;
        }

        if (cancelled) return;
        autoRejoinLookupDone.current = true;

        const mapped: Player[] = (g.players ?? []).map((p) => ({
          userId: p.userId,
          name: p.user?.name ?? "Игрок",
        }));

        setGameId(g.id);
        gameIdRef.current = g.id;
        setPlayers(mapped);
        setJoined(true);
        pendingAutoSocketJoin.current = true;

        const gameRes = await fetch(`/api/games/${g.id}`);
        if (gameRes.ok && !cancelled) {
          const gameData = await gameRes.json();
          const gm = gameData.game;
          setGame({
            id: gm.id,
            code: gm.code,
            status: gm.status,
            totalRounds: gm.totalRounds,
            maxPlayers: gm.maxPlayers,
          });
          setLoadingRounds(true);
          try {
            const roundsRes = await fetch(`/api/rounds?gameId=${g.id}`);
            if (roundsRes.ok && !cancelled) {
              const roundsData = await roundsRes.json();
              setRounds(roundsData.rounds || []);
            }
          } finally {
            if (!cancelled) setLoadingRounds(false);
          }
        }
      } catch {
        if (!cancelled) autoRejoinLookupDone.current = true;
      } finally {
        autoRejoinInFlight.current = false;
        setCheckingExistingPlayer(false);
      }
    }

    tryAutoRejoin();
    return () => {
      cancelled = true;
    };
  }, [userId, code]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      setCheckingExistingPlayer(false);
    }
  }, [sessionStatus]);

  // После автозахода подключаем сокет к комнате (отдельно от ручного «Присоединиться»)
  useEffect(() => {
    if (!pendingAutoSocketJoin.current || !isConnected || !userId) return;
    pendingAutoSocketJoin.current = false;
    emit("join_game", {
      code,
      userId,
      name: userName,
    });
  }, [isConnected, userId, code, userName, emit]);

  // Слушаем события Socket.io
  useEffect(() => {
    if (!isConnected) return;

    const unsubJoined = on("joined_game", (data: unknown) => {
      const { gameId: gId, players: p, status } = data as {
        gameId: string;
        players: Player[];
        status?: string;
      };
      setGameId(gId);
      gameIdRef.current = gId;
      setPlayers(p);
      setJoined(true);
      setLoading(false);

      // Загружаем данные игры и раундов
      loadGameData(gId);
    });

    const unsubPlayerJoined = on("player_joined", (data: unknown) => {
      const { players: updatedPlayers } = data as { players: Player[] };
      setPlayers(updatedPlayers);
    });

    const unsubPlayerLeft = on("player_left", (data: unknown) => {
      const { players: updatedPlayers } = data as { players: Player[] };
      setPlayers(updatedPlayers);
    });

    const unsubStarted = on("game_started", () => {
      // При старте игры обновляем статус и перезагружаем раунды
      const currentGameId = gameIdRef.current || gameId;
      if (currentGameId) {
        loadGameData(currentGameId);
      }
    });

    const unsubRoundStarted = on("round_started", () => {
      // При старте раунда обновляем список раундов
      const currentGameId = gameIdRef.current || gameId;
      if (currentGameId) {
        loadRounds(currentGameId);
      }
    });

    const unsubRoundResults = on("round_results", () => {
      // При завершении раунда обновляем список раундов
      const currentGameId = gameIdRef.current || gameId;
      if (currentGameId) {
        loadRounds(currentGameId);
      }
    });

    const unsubHostDisconnected = on("host_disconnected", (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
      setJoined(false);
    });

    const unsubError = on("error", (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
      setLoading(false);
    });

    return () => {
      unsubJoined();
      unsubPlayerJoined();
      unsubPlayerLeft();
      unsubStarted();
      unsubRoundStarted();
      unsubRoundResults();
      unsubHostDisconnected();
      unsubError();
    };
  }, [isConnected, on, gameId]);

  // Загрузка данных игры
  const loadGameData = async (gId: string) => {
    try {
      const gameRes = await fetch(`/api/games/${gId}`);
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        const g = gameData.game;
        setGame({
          id: g.id,
          code: g.code,
          status: g.status,
          totalRounds: g.totalRounds,
          maxPlayers: g.maxPlayers,
        });
        await loadRounds(gId);
      }
    } catch {
      setError("Ошибка загрузки данных игры");
    }
  };

  // Загрузка раундов
  const loadRounds = async (gId: string): Promise<void> => {
    setLoadingRounds(true);
    try {
      const roundsRes = await fetch(`/api/rounds?gameId=${gId}`);
      if (roundsRes.ok) {
        const roundsData = await roundsRes.json();
        setRounds(roundsData.rounds || []);
      }
    } catch {
      // Игнорируем ошибки загрузки раундов
    } finally {
      setLoadingRounds(false);
    }
  };

  // Присоединиться к игре
  const handleJoin = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Подключаемся к комнате через API
      const joinRes = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, userId }),
      });

      if (!joinRes.ok) {
        const data = await joinRes.json();
        setError(data.error || "Ошибка подключения");
        setLoading(false);
        return;
      }

      // Подключаемся через Socket.io
      emit("join_game", {
        code,
        userId,
        name: userName,
      });
    } catch {
      setError("Ошибка подключения к серверу");
      setLoading(false);
    }
  };

  // Экран лобби (уже подключился)
  if (joined && gameId) {
    return (
      <main
        className={`relative min-h-screen flex flex-col items-center p-4 md:p-8 ${joinPageMainBg}`}
      >
        <div className="fixed top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Верхняя панель */}
        <div className="mb-6 mt-4 flex w-full max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-3 md:flex-1 md:flex-row md:items-center md:gap-4">
            <h1 className="wine-quiz-page-title shrink-0 text-4xl font-bold md:text-6xl">
              🍷 Винная Викторина
            </h1>
            <div
              className={`hidden md:flex ${joinParticipantPanel} px-4 py-3`}
            >
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold text-[var(--foreground)]">Комната</p>
                <p className="font-mono text-xl font-bold text-[var(--primary)]">
                  {code}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-[var(--muted-foreground)] md:justify-end">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[var(--success)]" : "bg-[var(--error)]"
              }`}
            />
            {isConnected ? "Онлайн" : "Подключение..."}
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="w-full max-w-4xl mb-4">
            <div className="bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-4 py-2 rounded-xl text-sm text-center">
              {error}
            </div>
          </div>
        )}

        <div className="flex w-full max-w-4xl flex-col gap-6">
          {/* Информация о комнате (только смартфон) */}
          <div className={`md:hidden ${joinParticipantPanel} p-6 text-center`}>
            <h2 className="text-xl font-bold mb-2">Комната</h2>
            <p className="text-2xl font-mono font-bold text-[var(--primary)]">
              {code}
            </p>
          </div>

          {/* Раунды */}
          {game ? (
            <PlayerRoundsList
                rounds={rounds}
                totalRounds={game.totalRounds}
                gameId={gameId}
                gameStatus={game.status}
              />
          ) : null}

          {/* Игроки (сворачиваемый блок) */}
          <div className={joinMainPanelFrame}>
            <button
              type="button"
              onClick={() => setPlayersExpanded((open) => !open)}
              aria-expanded={playersExpanded}
              className="flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-4 text-left transition-colors hover:bg-[var(--wine-quiz-active-game-card-bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--wine-quiz-active-game-card-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            >
              <h2 className="text-xl font-bold">Игроки</h2>
              <span className="flex shrink-0 items-center gap-2">
                {game ? (
                  <span className="rounded-full border-2 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg-hover)] px-3 py-1 text-sm font-medium text-[var(--foreground)]">
                    {players.length} / {game.maxPlayers}
                  </span>
                ) : null}
                <span className="text-sm text-[var(--muted-foreground)]" aria-hidden>
                  {playersExpanded ? "▼" : "▶"}
                </span>
              </span>
            </button>

            {playersExpanded ? (
              <div className="max-h-64 space-y-3 overflow-y-auto border-t-2 border-[var(--wine-quiz-active-game-card-border)] px-4 pb-4 pt-3 no-scrollbar">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.userId}
                    className={`flex items-center gap-3 rounded-xl p-3 ${
                      player.userId === userId
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-[var(--wine-quiz-active-game-card-bg-hover)]"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-sm font-bold text-[var(--foreground)]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {player.name}
                        {player.userId === userId ? " (вы)" : ""}
                      </p>
                    </div>
                  </div>
                ))}

                {sortedPlayers.length === 0 ? (
                  <div className="py-6 text-center text-[var(--muted-foreground)]">
                    <div className="mb-2 text-3xl">⏳</div>
                    <p>Ожидание игроков...</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {game && game.status === "WAITING" ? (
            <div className="py-2 text-center text-[var(--muted-foreground)]">
              <span className="animate-pulse">⏳</span> Ожидайте, пока хост начнёт игру
            </div>
          ) : null}

          {game && game.status === "PLAYING" ? (
            <div className="py-2 text-center text-lg font-semibold text-[var(--primary)]">
              Идет игра
            </div>
          ) : null}


        </div>
      </main>
    );
  }

  // Пока сессия грузится — одна плашка ожидания вместо мигания «Присоединиться»
  if (sessionStatus === "loading") {
    return (
      <main
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${joinPageMainBg}`}
      >
        <div className="fixed top-4 right-4">
          <ThemeToggle />
        </div>
        <div
          className={`${joinParticipantPanel} p-8 text-center max-w-sm w-full`}
        >
          <div className="text-5xl mb-4">🍷</div>
          <p className="text-lg font-medium text-[var(--foreground)] mb-2">Винная Викторина</p>
          <p className="flex items-center justify-center gap-2 text-[var(--muted-foreground)]">
            <span className="animate-spin">⏳</span> Загрузка профиля...
          </p>
        </div>
      </main>
    );
  }

  // Экран подключения
  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-4 ${joinPageMainBg}`}
    >
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div
        className={`${joinParticipantPanel} p-8 text-center max-w-sm w-full`}
      >
        <div className="text-5xl mb-4">🍷</div>
        <h1 className="text-2xl font-bold mb-2">Винная Викторина</h1>
        <p className="text-[var(--muted-foreground)] mb-1">Комната</p>
        <p className="text-2xl font-mono font-bold text-[var(--primary)] mb-6">
          {code}
        </p>

        {error && (
          <div className="bg-[var(--error)] bg-opacity-10 text-[var(--error)] px-4 py-2 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Показываем имя из сессии */}
        <div
          className="mb-4 p-3 rounded-xl border-2 border-[var(--wine-quiz-active-game-card-border)] bg-[var(--wine-quiz-active-game-card-bg-hover)]"
        >
          <p className="text-sm text-[var(--muted-foreground)]">Вы входите как</p>
          <p className="text-lg font-semibold">{userName}</p>
        </div>

        <button
          onClick={handleJoin}
          disabled={loading || !isConnected || !userId || checkingExistingPlayer}
          className="w-full px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkingExistingPlayer ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Проверка комнаты...
            </span>
          ) : loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Подключение...
            </span>
          ) : (
            "Присоединиться"
          )}
        </button>

        {!isConnected && (
          <p className="mt-4 text-xs text-[var(--error)]">
            Подключение к серверу...
          </p>
        )}
      </div>
    </main>
  );
}
