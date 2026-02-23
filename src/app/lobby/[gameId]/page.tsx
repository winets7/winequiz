"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { useSocket } from "@/hooks/useSocket";
import { getJoinUrl } from "@/lib/game-code";
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
  maxPlayers: number;
  totalRounds: number;
  hostId: string;
  host: { id: string; name: string; avatar: string | null };
}

interface RoundData {
  id: string;
  roundNumber: number;
  status: string;
  grapeVarieties: string[];
  sweetness: string | null;
  vintageYear: number | null;
  country: string | null;
  alcoholContent: number | null;
  isOakAged: boolean | null;
  color: string | null;
  composition: string | null;
  photos: { id: string; imageUrl: string }[];
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { data: session } = useSession();

  const { isConnected, emit, on } = useSocket();

  const [game, setGame] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarting, setGameStarting] = useState(false);

  const userId = session?.user?.id;
  const isHost = game?.hostId === userId || game?.host?.id === userId;

  // =============================================
  // Загрузка данных
  // =============================================
  useEffect(() => {
    async function fetchData() {
      try {
        // Загружаем игру
        const gameRes = await fetch(`/api/games/${gameId}`);
        if (!gameRes.ok) {
          setError("Игра не найдена");
          return;
        }
        const gameData = await gameRes.json();
        const g = gameData.game;
        setGame({
          id: g.id,
          code: g.code,
          status: g.status,
          maxPlayers: g.maxPlayers,
          totalRounds: g.totalRounds,
          hostId: g.hostId || g.host?.id,
          host: g.host,
        });

        if (g.players) {
          setPlayers(
            g.players.map((p: { user: { id: string; name: string } }) => ({
              userId: p.user.id,
              name: p.user.name,
            }))
          );
        }

        // Загружаем существующие раунды
        const roundsRes = await fetch(`/api/rounds?gameId=${gameId}`);
        if (roundsRes.ok) {
          const roundsData = await roundsRes.json();
          setRounds(roundsData.rounds || []);
        }
      } catch {
        setError("Ошибка загрузки игры");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [gameId]);

  // =============================================
  // Socket.io
  // =============================================
  useEffect(() => {
    if (!isConnected || !game || !userId || !session?.user?.name) return;

    // Хост создаёт комнату, остальные подключаются
    if (isHost) {
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

  useEffect(() => {
    if (!isConnected) return;

    const unsubJoin = on("player_joined", (data: unknown) => {
      const { players: updatedPlayers } = data as { players: Player[] };
      setPlayers(updatedPlayers);
    });

    const unsubLeft = on("player_left", (data: unknown) => {
      const { players: updatedPlayers } = data as { players: Player[] };
      setPlayers(updatedPlayers);
    });

    const unsubStarted = on("game_started", () => {
      // Обновляем статус игры и перезагружаем раунды
      if (game) {
        setGame({ ...game, status: "PLAYING" });
        // Перезагружаем раунды
        fetch(`/api/rounds?gameId=${gameId}`)
          .then((res) => res.json())
          .then((data) => setRounds(data.rounds || []))
          .catch(() => {});
      }
      // Хост перенаправляется на страницу игры, игроки остаются в лобби
      if (isHost) {
        router.push(`/play/${gameId}`);
      }
    });

    const unsubRoundStarted = on("round_started", () => {
      // При старте раунда обновляем список раундов
      fetch(`/api/rounds?gameId=${gameId}`)
        .then((res) => res.json())
        .then((data) => setRounds(data.rounds || []))
        .catch(() => {});
    });

    const unsubRoundResults = on("round_results", () => {
      // При завершении раунда обновляем список раундов
      fetch(`/api/rounds?gameId=${gameId}`)
        .then((res) => res.json())
        .then((data) => setRounds(data.rounds || []))
        .catch(() => {});
    });

    const unsubError = on("error", (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
      setGameStarting(false);
    });

    return () => {
      unsubJoin();
      unsubLeft();
      unsubStarted();
      unsubRoundStarted();
      unsubRoundResults();
      unsubError();
    };
  }, [isConnected, on, gameId, game, router]);

  // =============================================
  // Обработчики раундов
  // =============================================

  const openRoundEditor = (roundNum: number) => {
    router.push(`/lobby/${gameId}/round/${roundNum}/edit`);
  };

  // Начать игру
  const handleStartGame = useCallback(() => {
    if (!game) return;
    setGameStarting(true);
    emit("start_game", { code: game.code });
  }, [game, emit]);

  // Начать раунд (хост: activate_round)
  const handleStartRound = useCallback(
    async (roundId: string, roundNumber: number) => {
      if (!game) return;
      emit("activate_round", {
        code: game.code,
        roundId,
        roundNumber,
      });
      const roundsRes = await fetch(`/api/rounds?gameId=${game.id}`);
      if (roundsRes.ok) {
        const data = await roundsRes.json();
        setRounds(data.rounds || []);
      }
    },
    [game, emit]
  );

  // Завершить раунд (хост: close_round)
  const handleCloseRound = useCallback(
    async (roundId: string) => {
      if (!game) return;
      emit("close_round", { code: game.code, roundId });
      const roundsRes = await fetch(`/api/rounds?gameId=${game.id}`);
      if (roundsRes.ok) {
        const data = await roundsRes.json();
        setRounds(data.rounds || []);
      }
    },
    [game, emit]
  );

  // Копировать код
  const handleCopyCode = useCallback(() => {
    if (!game) return;
    navigator.clipboard.writeText(game.code);
  }, [game]);

  // =============================================
  // Проверки
  // =============================================

  // Получаем данные по номеру раунда
  const getRoundData = (roundNumber: number): RoundData | undefined => {
    return rounds.find((r) => r.roundNumber === roundNumber);
  };

  // Проверка заполненности раунда
  const isRoundFilled = (roundNumber: number): boolean => {
    const round = getRoundData(roundNumber);
    if (!round) return false;
    // Минимум: цвет вина должен быть указан
    return !!round.color;
  };

  // Все раунды заполнены?
  const allRoundsFilled =
    game ? Array.from({ length: game.totalRounds }, (_, i) => i + 1).every(isRoundFilled) : false;

  // Можно ли начать игру?
  const canStartGame = allRoundsFilled && players.length >= 1 && !gameStarting;

  // =============================================
  // Рендеринг
  // =============================================

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍷</div>
          <p className="text-[var(--muted-foreground)]">Загрузка...</p>
        </div>
      </main>
    );
  }

  if (error && !game) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-xl text-[var(--error)]">{error || "Игра не найдена"}</p>
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

  if (!game) return null;

  const joinUrl = getJoinUrl(game.code);
  const roundNumbers = Array.from({ length: game.totalRounds }, (_, i) => i + 1);

  // Основной экран лобби
  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Верхняя панель */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary)]">
          🍷 Винная Викторина
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[var(--success)]" : "bg-[var(--error)]"
              }`}
            />
            {isConnected ? "Онлайн" : "Подключение..."}
          </div>
          <ThemeToggle />
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
        {/* ═══ Левая колонка ═══ */}
        <div className="flex-1 space-y-4">
          {/* QR-код и код комнаты */}
          <div className="bg-[var(--card)] rounded-3xl p-6 shadow-lg border border-[var(--border)] text-center">
            <div className="bg-white p-3 rounded-2xl inline-block mb-4">
              <QRCodeSVG
                value={joinUrl}
                size={180}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1A1118"
              />
            </div>
            <div className="mb-3">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Код комнаты</p>
              <button
                onClick={handleCopyCode}
                className="text-3xl font-mono font-bold text-[var(--primary)] hover:opacity-80 transition-opacity"
                title="Нажмите чтобы скопировать"
              >
                {game.code}
              </button>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Нажмите для копирования
              </p>
            </div>
          </div>

          {/* Раунды */}
          <PlayerRoundsList
            rounds={rounds.map((r) => ({
              id: r.id,
              roundNumber: r.roundNumber,
              status: r.status,
              color: r.color,
              country: r.country,
              vintageYear: r.vintageYear,
              grapeVarieties: r.grapeVarieties,
            }))}
            totalRounds={game.totalRounds}
            gameId={game.id}
            gameStatus={game.status}
            variant={isHost ? "host" : "player"}
            allRoundsFilled={allRoundsFilled}
            onStartRound={isHost ? handleStartRound : undefined}
            onCloseRound={isHost ? handleCloseRound : undefined}
            onEditRound={isHost ? openRoundEditor : undefined}
          />

          {/* Настройки игры */}
          <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Раундов:</span>
              <span className="font-semibold">{game.totalRounds}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-[var(--muted-foreground)]">Макс. игроков:</span>
              <span className="font-semibold">{game.maxPlayers}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-[var(--muted-foreground)]">Хост:</span>
              <span className="font-semibold">{game.host.name}</span>
            </div>
          </div>
        </div>

        {/* ═══ Правая колонка ═══ */}
        <div className="flex-1 space-y-4">
          {/* Игроки */}
          <div className="bg-[var(--card)] rounded-3xl p-6 shadow-lg border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Игроки</h2>
              <span className="bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full text-sm font-medium">
                {players.length} / {game.maxPlayers}
              </span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
              {players.map((player, index) => (
                <div
                  key={player.userId}
                  className="flex items-center gap-3 p-3 bg-[var(--muted)] rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{player.name}</p>
                    {player.userId === game.host.id && (
                      <p className="text-xs text-[var(--secondary)]">👑 Хост</p>
                    )}
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

          {/* Кнопка старта (только хост) */}
          {isHost && (
            <div className="space-y-2">
              <button
                onClick={handleStartGame}
                disabled={!canStartGame}
                className="w-full px-8 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gameStarting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Запуск...
                  </span>
                ) : (
                  "🚀 Начать игру"
                )}
              </button>

              {!allRoundsFilled && (
                <p className="text-center text-sm text-[var(--muted-foreground)]">
                  Заполните все раунды, чтобы начать игру
                </p>
              )}
            </div>
          )}

          {/* Участники ожидают */}
          {!isHost && (
            <div className="text-center py-4 text-[var(--muted-foreground)]">
              <span className="animate-pulse">⏳</span> Ожидайте, пока хост начнёт игру
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
