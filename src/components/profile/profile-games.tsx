"use client";

import { useState } from "react";

interface HostedGame {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  createdAt: string;
  finishedAt: string | null;
  playersCount: number;
  players: {
    id: string;
    score: number;
    position: number | null;
    user: { id: string; name: string; avatar: string | null };
  }[];
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
  myScore: number;
  myPosition: number | null;
}

interface ProfileGamesProps {
  hostedGames: HostedGame[];
  participatedGames: ParticipatedGame[];
}

function StatusBadge({ status }: { status: string }) {
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

  const c = config[status] || config.FINISHED;

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.className}`}>
      {c.label}
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

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PositionBadge({ position }: { position: number | null }) {
  if (!position) return null;

  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const medal = medals[position];

  return (
    <span className="text-sm font-semibold">
      {medal || `#${position}`}
    </span>
  );
}

export function ProfileGames({ hostedGames, participatedGames }: ProfileGamesProps) {
  const [activeTab, setActiveTab] = useState<"hosted" | "participated">("hosted");

  return (
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
          🎲 Созданные
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
          🎮 Участвовал
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
          <HostedGamesList games={hostedGames} />
        )}
        {activeTab === "participated" && (
          <ParticipatedGamesList games={participatedGames} />
        )}
      </div>
    </div>
  );
}

function HostedGamesList({ games }: { games: HostedGame[] }) {
  if (games.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--muted-foreground)]">
        <div className="text-4xl mb-3">🎲</div>
        <p className="font-medium">Пока нет созданных игр</p>
        <p className="text-sm mt-1">Создайте свою первую викторину!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div
          key={game.id}
          className="bg-[var(--muted)] rounded-xl p-4 hover:bg-[var(--border)] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--primary)] text-sm">
                {game.code}
              </span>
              <StatusBadge status={game.status} />
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
            {game.finishedAt && (
              <span className="text-xs text-[var(--muted-foreground)]">
                ⏱ {formatTime(game.finishedAt)}
              </span>
            )}
          </div>

          {/* Топ-3 игрока */}
          {game.status === "FINISHED" && game.players.length > 0 && (
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
        </div>
      ))}
    </div>
  );
}

function ParticipatedGamesList({ games }: { games: ParticipatedGame[] }) {
  if (games.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--muted-foreground)]">
        <div className="text-4xl mb-3">🎮</div>
        <p className="font-medium">Пока нет игр</p>
        <p className="text-sm mt-1">Присоединитесь к игре по коду!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div
          key={game.id}
          className="bg-[var(--muted)] rounded-xl p-4 hover:bg-[var(--border)] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--primary)] text-sm">
                {game.code}
              </span>
              <StatusBadge status={game.status} />
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
          </div>

          {/* Мой результат */}
          {game.status === "FINISHED" && (
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
        </div>
      ))}
    </div>
  );
}
