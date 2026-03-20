"use client";

import { useEffect, useRef, useState } from "react";
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

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;
  const { data: session } = useSession();

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

  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? "Игрок";

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

  // Уже в игре в БД — сразу лобби (возврат по /join/... без кнопки)
  useEffect(() => {
    if (!userId || !code || !isValidGameCode(code)) return;
    if (autoRejoinLookupDone.current || autoRejoinInFlight.current) return;

    let cancelled = false;
    autoRejoinInFlight.current = true;

    async function tryAutoRejoin() {
      setCheckingExistingPlayer(true);
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
      <main className="min-h-screen flex flex-col items-center p-4 md:p-8">
        <div className="fixed top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Верхняя панель */}
        <div className="w-full max-w-4xl flex items-center justify-between mb-6 mt-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary)]">
            🍷 Винная Викторина
          </h1>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
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

        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6">
          {/* Левая колонка */}
          <div className="flex-1 space-y-4">
            {/* Информация о комнате */}
            <div className="bg-[var(--card)] rounded-3xl p-6 shadow-lg border border-[var(--border)] text-center">
              <div className="text-5xl mb-4">🍷</div>
              <h2 className="text-xl font-bold mb-2">Комната</h2>
              <p className="text-2xl font-mono font-bold text-[var(--primary)] mb-4">
                {code}
              </p>
              {game && (
                <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                  <p>Раундов: {game.totalRounds}</p>
                  <p>Макс. игроков: {game.maxPlayers}</p>
                  <p className="mt-2">
                    Статус:{" "}
                    {game.status === "WAITING" ? (
                      <span className="text-[var(--muted-foreground)]">Ожидание</span>
                    ) : game.status === "PLAYING" ? (
                      <span className="text-[var(--primary)]">Игра идёт</span>
                    ) : (
                      <span className="text-[var(--success)]">Завершена</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Раунды */}
            {game && (
              <PlayerRoundsList
                rounds={rounds}
                totalRounds={game.totalRounds}
                gameId={gameId}
                gameStatus={game.status}
              />
            )}
          </div>

          {/* Правая колонка */}
          <div className="flex-1 space-y-4">
            {/* Игроки */}
            <div className="bg-[var(--card)] rounded-3xl p-6 shadow-lg border border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Игроки</h2>
                {game && (
                  <span className="bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full text-sm font-medium">
                    {players.length} / {game.maxPlayers}
                  </span>
                )}
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                {players.map((player, index) => (
                  <div
                    key={player.userId}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      player.userId === userId
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-[var(--muted)]"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {player.name}
                        {player.userId === userId && " (вы)"}
                      </p>
                    </div>
                  </div>
                ))}

                {players.length === 0 && (
                  <div className="text-center py-6 text-[var(--muted-foreground)]">
                    <div className="text-3xl mb-2">⏳</div>
                    <p>Ожидание игроков...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Статус ожидания */}
            {game && game.status === "WAITING" && (
              <div className="text-center py-4 text-[var(--muted-foreground)]">
                <span className="animate-pulse">⏳</span> Ожидайте, пока хост начнёт игру
              </div>
            )}

            {game && game.status === "PLAYING" && (
              <div className="text-center py-4 text-[var(--primary)] font-semibold text-lg">
                Идет игра
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Экран подключения
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="bg-[var(--card)] rounded-3xl p-8 shadow-lg border border-[var(--border)] text-center max-w-sm w-full">
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
        <div className="mb-4 p-3 bg-[var(--muted)] rounded-xl">
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
