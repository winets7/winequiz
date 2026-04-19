"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface GamePlayer {
  id: string;
  score: number;
  position: number | null;
  user: { id: string; name: string; avatar: string | null };
}

interface HostedGame {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  createdAt: string;
  finishedAt: string | null;
  playersCount: number;
  players: GamePlayer[];
}

interface ParticipatedGame {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  createdAt: string;
  finishedAt: string | null;
  host: { id: string; name: string; avatar: string | null };
  playersCount: number;
  players: GamePlayer[];
  myScore: number;
  myPosition: number | null;
}

type AnyGame = (HostedGame | ParticipatedGame) & { _type: "hosted" | "participated" };

interface ProfileGamesProps {
  hostedGames: HostedGame[];
  participatedGames: ParticipatedGame[];
}

/* ─── Утилиты ─── */

/** Единая логика завершённости: статус в БД или отметка времени окончания */
function isGameFinished(status: string, finishedAt: string | null | undefined): boolean {
  return status === "FINISHED" || Boolean(finishedAt);
}

function StatusBadge({
  status,
  finishedAt,
}: {
  status: string;
  finishedAt: string | null;
}) {
  const config: Record<string, { label: string; className: string }> = {
    WAITING: {
      label: "Ожидание",
      className: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    },
    PLAYING: {
      label: "Идёт игра",
      className: "bg-[var(--primary)] text-[var(--primary-foreground)]",
    },
    FINISHED: {
      label: "Завершена",
      className: "bg-[var(--muted)] text-[var(--muted-foreground)]",
    },
  };

  if (isGameFinished(status, finishedAt)) {
    const c = config.FINISHED;
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.className}`}>
        {c.label}
      </span>
    );
  }

  const c = config[status];
  if (c) {
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.className}`}>
        {c.label}
      </span>
    );
  }

  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--border)] text-[var(--muted-foreground)]">
      Неизвестно
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PositionBadge({ position }: { position: number | null }) {
  if (!position) return null;
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return <span className="text-sm font-semibold">{medals[position] || `#${position}`}</span>;
}

function gameDuration(createdAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(createdAt).getTime();
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec} сек`;
  return `${min} мин ${sec} сек`;
}

/* ─── Компонент ссылки на профиль игрока ─── */

function PlayerLink({
  player,
  index,
  showResults,
}: {
  player: GamePlayer;
  index: number;
  showResults: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Если это собственный профиль, переходим сразу
    if (session?.user?.id === player.user.id) {
      router.push(`/profile/${player.user.id}`);
      return;
    }

    // Если это админ, переходим сразу
    if (session?.user?.role === "ADMIN") {
      router.push(`/profile/${player.user.id}`);
      return;
    }

    // Проверяем доступность профиля
    setIsChecking(true);
    try {
      const res = await fetch(`/api/users/${player.user.id}/profile`);
      if (res.ok) {
        // Профиль доступен, переходим
        router.push(`/profile/${player.user.id}`);
      } else {
        // Профиль недоступен
        const data = await res.json();
        alert(data.error || "Профиль недоступен");
      }
    } catch (error) {
      console.error("Ошибка проверки профиля:", error);
      alert("Не удалось проверить доступность профиля");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isChecking}
      className="w-full flex items-center gap-3 bg-[var(--muted)] rounded-xl p-3 hover:bg-[var(--border)] transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Позиция / Номер */}
      <div className="w-8 text-center shrink-0">
        {showResults && player.position ? (
          <PositionBadge position={player.position} />
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">
            {index + 1}
          </span>
        )}
      </div>

      {/* Аватар */}
      <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-xs font-bold shrink-0">
        {player.user.avatar ? (
          <img
            src={player.user.avatar}
            alt={player.user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          player.user.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Имя */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[var(--foreground)] truncate">
          {player.user.name}
        </div>
      </div>

      {/* Счёт */}
      {showResults && (
        <div className="text-sm font-semibold text-[var(--foreground)] shrink-0">
          {player.score} очк.
        </div>
      )}
    </button>
  );
}

/* ─── Модальное окно карточки игры ─── */

function GameModal({ game, onClose }: { game: AnyGame; onClose: () => void }) {
  const router = useRouter();
  const isParticipated = game._type === "participated";
  const isHosted = game._type === "hosted";
  const pGame = game as ParticipatedGame;

  const isFinished = isGameFinished(game.status, game.finishedAt);
  // В активную игру не пускаем, если сессия по факту уже завершена (статус + finishedAt)
  const canEnterActiveGame =
    !isFinished && (game.status === "WAITING" || game.status === "PLAYING");
  // Созданная игра → лобби по id; игра из вкладки «Участвовал» → join по коду комнаты.
  const gameLink = canEnterActiveGame
    ? game._type === "hosted"
      ? `/lobby/${game.id}`
      : `/join/${game.code}`
    : null;

  const handleGoToGame = () => {
    if (gameLink) {
      onClose();
      router.push(gameLink);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Затемнение */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Карточка */}
      <div
        className="relative bg-[var(--card)] rounded-3xl shadow-2xl border border-[var(--border)] w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] rounded-t-3xl px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍷</span>
            <div>
              {gameLink ? (
                <button
                  onClick={handleGoToGame}
                  className="font-mono font-bold text-[var(--primary)] text-lg hover:underline cursor-pointer"
                >
                  {game.code}
                </button>
              ) : (
                <div className="font-mono font-bold text-[var(--primary)] text-lg">
                  {game.code}
                </div>
              )}
              <StatusBadge status={game.status} finishedAt={game.finishedAt} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Информация */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Детали */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Создана" value={formatDateTime(game.createdAt)} />
            {game.finishedAt && (
              <InfoItem label="Завершена" value={formatDateTime(game.finishedAt)} />
            )}
            <InfoItem label="Раундов" value={String(game.totalRounds)} />
            <InfoItem label="Длительность" value={gameDuration(game.createdAt, game.finishedAt)} />
            <InfoItem label="Игроков" value={String(game.playersCount)} />
            {isParticipated && (
              <InfoItem label="Хост" value={pGame.host.name} />
            )}
          </div>

          {/* Мой результат (для participated) */}
          {isParticipated && isFinished && (
            <div className="bg-[var(--muted)] rounded-xl p-4">
              <div className="text-xs text-[var(--muted-foreground)] mb-2 font-medium">
                Мой результат
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PositionBadge position={pGame.myPosition} />
                  <span className="text-lg font-bold text-[var(--foreground)]">
                    {pGame.myScore} очков
                  </span>
                </div>
                {pGame.myPosition === 1 && (
                  <span className="text-xs bg-[var(--secondary)] text-[var(--secondary-foreground)] px-2.5 py-1 rounded-full font-semibold">
                    🏆 Победа!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Таблица игроков */}
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)] mb-3">
              👥 Участники ({game.players.length})
            </div>
            <div className="space-y-2">
              {game.players.map((player, index) => (
                <PlayerLink key={player.id} player={player} index={index} showResults={isFinished} />
              ))}

              {game.players.length === 0 && (
                <div className="text-center py-4 text-sm text-[var(--muted-foreground)]">
                  Нет участников
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Кнопки действий - всегда видимы внизу, вне прокрутки */}
        <div className="bg-[var(--card)] border-t border-[var(--border)] rounded-b-3xl px-6 py-4 space-y-2 shrink-0 min-h-[60px] flex flex-col justify-center">
          {isHosted && (
            <button
              type="button"
              onClick={() => {
                window.open(`/scoreboard/${game.id}`, "_blank");
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#DAA520] to-[#C4941A] text-[#3D0F1E] rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2"
            >
              📊 Scoreboard
            </button>
          )}
          {isFinished && (
            <button
              onClick={() => {
                onClose();
                router.push(`/history/${game.id}`);
              }}
              className="w-full px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
            >
              📋 История ответов
            </button>
          )}
          {gameLink && (
            <button
              onClick={handleGoToGame}
              className="w-full px-6 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {game._type === "hosted"
                ? game.status === "WAITING"
                  ? "🚀 Перейти в лобби"
                  : "🎮 Перейти в лобби"
                : game.status === "WAITING"
                  ? "🚀 Перейти в комнату"
                  : "🎮 Перейти в комнату"}
            </button>
          )}
          {!isFinished && !gameLink && (
            <div className="text-center text-xs text-[var(--muted-foreground)] py-2">
              Действия недоступны
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--muted)] rounded-lg px-3 py-2">
      <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-medium text-[var(--foreground)] mt-0.5">
        {value}
      </div>
    </div>
  );
}

/* ─── Основной компонент ─── */

export function ProfileGames({ hostedGames, participatedGames }: ProfileGamesProps) {
  const [activeTab, setActiveTab] = useState<"hosted" | "participated">("hosted");
  const [selectedGame, setSelectedGame] = useState<AnyGame | null>(null);

  const openHosted = (game: HostedGame) =>
    setSelectedGame({ ...game, _type: "hosted" });
  const openParticipated = (game: ParticipatedGame) =>
    setSelectedGame({ ...game, _type: "participated" });

  return (
    <>
      <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] overflow-hidden">
        {/* Табы */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab("hosted")}
            className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-colors relative ${
              activeTab === "hosted"
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            🍷 Созданные
            <span className="ml-1.5 text-xs bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded-full">
              {hostedGames.length}
            </span>
            {activeTab === "hosted" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("participated")}
            className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-colors relative ${
              activeTab === "participated"
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            🍇 Участвовал
            <span className="ml-1.5 text-xs bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded-full">
              {participatedGames.length}
            </span>
            {activeTab === "participated" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
            )}
          </button>
        </div>

        {/* Содержимое табов */}
        <div className="p-4 md:p-6">
          {activeTab === "hosted" && (
            <HostedGamesList games={hostedGames} onSelect={openHosted} />
          )}
          {activeTab === "participated" && (
            <ParticipatedGamesList games={participatedGames} onSelect={openParticipated} />
          )}
        </div>
      </div>

      {/* Модалка */}
      {selectedGame && (
        <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </>
  );
}

/* ─── Списки игр ─── */

function HostedGamesList({
  games,
  onSelect,
}: {
  games: HostedGame[];
  onSelect: (g: HostedGame) => void;
}) {
  if (games.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--muted-foreground)]">
        <div className="text-4xl mb-3">🍷</div>
        <p className="font-medium">Пока нет созданных игр</p>
        <p className="text-sm mt-1">Создайте свою первую викторину!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <button
          key={game.id}
          onClick={() => onSelect(game)}
          className="w-full text-left bg-[var(--muted)] rounded-xl p-4 hover:bg-[var(--border)] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--primary)] text-sm">
                {game.code}
              </span>
              <StatusBadge status={game.status} finishedAt={game.finishedAt} />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatDate(game.createdAt)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-[var(--muted-foreground)]">
              <span>👥 {game.playersCount} игроков</span>
              <span>📋 {game.totalRounds} раундов</span>
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">▸</span>
          </div>

          {/* Топ-3 игрока */}
          {isGameFinished(game.status, game.finishedAt) && game.players.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {game.players
                  .filter((p) => p.position && p.position <= 3)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 text-xs shrink-0"
                    >
                      <PositionBadge position={p.position} />
                      <span className="text-[var(--foreground)] font-medium">
                        {p.user.name}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {p.score} очк.
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function ParticipatedGamesList({
  games,
  onSelect,
}: {
  games: ParticipatedGame[];
  onSelect: (g: ParticipatedGame) => void;
}) {
  if (games.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--muted-foreground)]">
        <div className="text-4xl mb-3">🍇</div>
        <p className="font-medium">Пока нет игр</p>
        <p className="text-sm mt-1">Присоединитесь к игре по коду!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <button
          key={game.id}
          onClick={() => onSelect(game)}
          className="w-full text-left bg-[var(--muted)] rounded-xl p-4 hover:bg-[var(--border)] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--primary)] text-sm">
                {game.code}
              </span>
              <StatusBadge status={game.status} finishedAt={game.finishedAt} />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatDate(game.createdAt)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-[var(--muted-foreground)]">
              <span>👤 Хост: {game.host.name}</span>
              <span>👥 {game.playersCount} игроков</span>
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">▸</span>
          </div>

          {/* Мой результат */}
          {isGameFinished(game.status, game.finishedAt) && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PositionBadge position={game.myPosition} />
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {game.myScore} очков
                </span>
              </div>
              {game.myPosition === 1 && (
                <span className="text-xs bg-[var(--secondary)] text-[var(--secondary-foreground)] px-2 py-0.5 rounded-full font-medium">
                  Победа!
                </span>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
