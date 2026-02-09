"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useSocket } from "@/hooks/useSocket";
import { getJoinUrl } from "@/lib/game-code";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  host: { id: string; name: string; avatar: string | null };
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const { isConnected, emit, on } = useSocket();

  const [game, setGame] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarting, setGameStarting] = useState(false);

  // Загружаем данные игры
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (!res.ok) {
          setError("Игра не найдена");
          return;
        }
        const data = await res.json();
        setGame(data.game);

        if (data.game.players) {
          setPlayers(
            data.game.players.map((p: { user: { id: string; name: string } }) => ({
              userId: p.user.id,
              name: p.user.name,
            }))
          );
        }
      } catch {
        setError("Ошибка загрузки игры");
      } finally {
        setLoading(false);
      }
    }
    fetchGame();
  }, [gameId]);

  // Подключаемся к Socket.io комнате
  useEffect(() => {
    if (!isConnected || !game) return;

    emit("create_game", {
      gameId: game.id,
      code: game.code,
      userId: game.host.id,
      name: game.host.name,
    });
  }, [isConnected, game, emit]);

  // Слушаем события
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
      router.push(`/play/${gameId}`);
    });

    const unsubError = on("error", (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
    });

    return () => {
      unsubJoin();
      unsubLeft();
      unsubStarted();
      unsubError();
    };
  }, [isConnected, on, gameId, router]);

  // Начать игру
  const handleStartGame = useCallback(() => {
    if (!game) return;
    setGameStarting(true);
    emit("start_game", { code: game.code });
  }, [game, emit]);

  // Копировать код
  const handleCopyCode = useCallback(() => {
    if (!game) return;
    navigator.clipboard.writeText(game.code);
  }, [game]);

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

  if (error || !game) {
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

  const joinUrl = getJoinUrl(game.code);

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Верхняя панель */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary)]">
          🍷 Винная Викторина
        </h1>
        <div className="flex items-center gap-3">
          {/* Статус подключения */}
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

      {/* Основной контент */}
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8">
        {/* Левая колонка — QR-код */}
        <div className="flex-1 flex flex-col items-center">
          <div className="bg-[var(--card)] rounded-3xl p-8 shadow-lg border border-[var(--border)] text-center w-full max-w-sm">
            {/* QR-код */}
            <div className="bg-white p-4 rounded-2xl inline-block mb-6">
              <QRCodeSVG
                value={joinUrl}
                size={200}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1A1118"
              />
            </div>

            {/* Код комнаты */}
            <div className="mb-4">
              <p className="text-sm text-[var(--muted-foreground)] mb-1">
                Код комнаты
              </p>
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

            <p className="text-sm text-[var(--muted-foreground)]">
              Отсканируйте QR-код или введите код для подключения
            </p>
          </div>

          {/* Настройки игры */}
          <div className="bg-[var(--card)] rounded-2xl p-4 mt-4 shadow border border-[var(--border)] w-full max-w-sm">
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

        {/* Правая колонка — Игроки */}
        <div className="flex-1">
          <div className="bg-[var(--card)] rounded-3xl p-6 shadow-lg border border-[var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Игроки</h2>
              <span className="bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full text-sm font-medium">
                {players.length} / {game.maxPlayers}
              </span>
            </div>

            {/* Список игроков */}
            <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
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
                    {index === 0 && (
                      <p className="text-xs text-[var(--secondary)]">👑 Хост</p>
                    )}
                  </div>
                </div>
              ))}

              {players.length === 0 && (
                <div className="text-center py-8 text-[var(--muted-foreground)]">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Ожидание игроков...</p>
                </div>
              )}
            </div>
          </div>

          {/* Кнопка старта */}
          <button
            onClick={handleStartGame}
            disabled={players.length < 1 || gameStarting}
            className="w-full mt-6 px-8 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gameStarting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Запуск...
              </span>
            ) : (
              "🚀 Начать игру"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
