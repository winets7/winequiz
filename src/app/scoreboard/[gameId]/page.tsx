"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface GameInfo {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  createdAt: string;
  finishedAt: string | null;
  host: { id: string; name: string; avatar: string | null };
}

interface PlayerScoreboard {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  totalScore: number;
  roundScores: (number | null)[];
}

interface RoundInfo {
  roundNumber: number;
  status: string;
}

interface ScoreboardData {
  game: GameInfo;
  players: PlayerScoreboard[];
  rounds: RoundInfo[];
}

export default function ScoreboardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { data: session, status: sessionStatus } = useSession();

  const [data, setData] = useState<ScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    async function fetchScoreboard() {
      try {
        const res = await fetch(`/api/games/${gameId}/scoreboard`);
        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || "Не удалось загрузить scoreboard");
          return;
        }
        const scoreboardData = await res.json();
        setData(scoreboardData);
      } catch {
        setError("Ошибка подключения к серверу");
      } finally {
        setLoading(false);
      }
    }

    fetchScoreboard();
  }, [gameId, session, sessionStatus, router]);

  // Автообновление каждые 5 секунд
  useEffect(() => {
    if (!data) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/scoreboard`);
        if (res.ok) {
          const scoreboardData = await res.json();
          setData(scoreboardData);
        }
      } catch {
        // Игнорируем ошибки автообновления
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [gameId, data]);

  if (sessionStatus === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--wine-950)] to-[var(--wine-900)]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🍷</div>
          <p className="text-white text-xl">Загрузка результатов...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--wine-950)] to-[var(--wine-900)] p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">😕</div>
          <p className="text-white text-2xl">{error || "Данные не найдены"}</p>
          <button
            onClick={() => router.push(`/play/${gameId}`)}
            className="px-8 py-4 bg-[var(--gold-500)] text-[var(--wine-900)] rounded-xl text-lg font-bold hover:opacity-90 transition-opacity"
          >
            Вернуться к игре
          </button>
        </div>
      </main>
    );
  }

  const getMedal = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return null;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return "bg-gradient-to-r from-[#DAA520] to-[#C4941A] text-[#3D0F1E]";
    if (position === 2) return "bg-gradient-to-r from-gray-300 to-gray-400 text-[#3D0F1E]";
    if (position === 3) return "bg-gradient-to-r from-[#A07714] to-[#7C5C10] text-white";
    return "bg-[#5A1A2A] text-white";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1A1118] via-[#3D0F1E] to-[#5A1A2A] p-6 md:p-8 lg:p-12">
      {/* Заголовок */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-2 flex items-center justify-center gap-3 flex-wrap">
          <span className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl">🍷</span>
          <span>ВИННАЯ ВИКТОРИНА</span>
          <span className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl">🍷</span>
        </h1>
        <div className="text-xl md:text-2xl lg:text-3xl xl:text-4xl text-[#F0C75E] font-mono font-bold mb-2">
          {data.game.code}
        </div>
        <div className="text-lg md:text-xl lg:text-2xl text-white/80">
          Результаты по раундам
        </div>
      </div>

      {/* Таблица результатов */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#3D0F1E]/90 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-[#DAA520]/30 overflow-hidden">
          {/* Заголовок таблицы */}
          <div className="bg-[#5A1A2A] border-b-2 border-[#DAA520]/30">
            <div 
              className="grid gap-2 md:gap-4 p-4 md:p-6"
              style={{
                gridTemplateColumns: `2fr repeat(${data.rounds.length}, 1fr) 1.5fr`
              }}
            >
              <div className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-[#F0C75E]">
                Игрок
              </div>
              {data.rounds.map((round) => (
                <div
                  key={round.roundNumber}
                  className="text-center text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-white"
                >
                  Р{round.roundNumber}
                </div>
              ))}
              <div className="text-center text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-[#F0C75E]">
                Итого
              </div>
            </div>
          </div>

          {/* Тело таблицы */}
          <div className="divide-y divide-[#722F37]">
            {data.players.map((player) => {
              const medal = getMedal(player.position);
              return (
                <div
                  key={player.userId}
                  className={`${getPositionColor(player.position)} transition-all hover:brightness-110`}
                >
                  <div 
                    className="grid gap-2 md:gap-4 p-4 md:p-6 items-center"
                    style={{
                      gridTemplateColumns: `2fr repeat(${data.rounds.length}, 1fr) 1.5fr`
                    }}
                  >
                    {/* Имя игрока */}
                    <div className="flex items-center gap-3 md:gap-4">
                      {medal && (
                        <span className="text-2xl md:text-3xl lg:text-4xl">
                          {medal}
                        </span>
                      )}
                      <div className="flex items-center gap-2 md:gap-3">
                        {player.avatar && (
                          <img
                            src={player.avatar}
                            alt={player.name}
                            className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full border-2 border-white/50"
                          />
                        )}
                        <span className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold truncate">
                          {player.name}
                        </span>
                      </div>
                    </div>

                    {/* Баллы по раундам */}
                    {player.roundScores.map((score, index) => (
                      <div
                        key={index}
                        className="text-center text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold"
                      >
                        {score !== null ? (
                          <span className={score > 0 ? "text-green-300" : "text-red-300"}>
                            {score}
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </div>
                    ))}

                    {/* Итоговый счёт */}
                    <div className="text-center text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">
                      {player.totalScore}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
