"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { isValidGameCode } from "@/lib/game-code";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Player {
  userId: string;
  name: string;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { data: session } = useSession();

  const { isConnected, emit, on } = useSocket();

  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? "Игрок";

  // Валидация кода при загрузке
  useEffect(() => {
    if (!isValidGameCode(code)) {
      setError("Неверный код комнаты");
    }
  }, [code]);

  // Слушаем события Socket.io
  useEffect(() => {
    if (!isConnected) return;

    const unsubJoined = on("joined_game", (data: unknown) => {
      const { gameId: gId, players: p } = data as {
        gameId: string;
        players: Player[];
      };
      setGameId(gId);
      setPlayers(p);
      setJoined(true);
      setLoading(false);
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
      if (gameId) {
        router.push(`/play/${gameId}`);
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
      unsubHostDisconnected();
      unsubError();
    };
  }, [isConnected, on, gameId, router]);

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

  // Экран ожидания (уже подключился)
  if (joined) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="fixed top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="bg-[var(--card)] rounded-3xl p-8 shadow-lg border border-[var(--border)] text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🍷</div>
          <h1 className="text-2xl font-bold mb-2">Вы в игре!</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Ожидайте, пока хост начнёт игру
          </p>

          {/* Список игроков */}
          <div className="text-left space-y-2 max-h-60 overflow-y-auto no-scrollbar">
            {players.map((player, index) => (
              <div
                key={player.userId}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  player.userId === userId
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--muted)]"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center font-bold text-xs">
                  {index + 1}
                </div>
                <span className="font-medium">
                  {player.name}
                  {player.userId === userId && " (вы)"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span className="animate-pulse">⏳</span>
            <span>Игроков: {players.length}</span>
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
          disabled={loading || !isConnected || !userId}
          className="w-full px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
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
