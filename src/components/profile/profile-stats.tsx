"use client";

interface ProfileStatsProps {
  stats: {
    totalGames: number;
    plannedGames: number;
    totalWins: number;
    totalGuesses: number;
    totalPoints: number;
    bestScore: number;
  };
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)] flex flex-col items-center text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-[var(--foreground)]">{value}</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</div>
      {sub && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-1 opacity-70">{sub}</div>
      )}
    </div>
  );
}

export function ProfileStats({ stats }: ProfileStatsProps) {
  const winRate = stats.totalGames > 0
    ? Math.round((stats.totalWins / stats.totalGames) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <StatCard
        icon="📋"
        label="Запланировано"
        value={stats.plannedGames}
        sub="в ожидании"
      />
      <StatCard
        icon="🍷"
        label="Игр сыграно"
        value={stats.totalGames}
        sub={`${stats.totalWins} побед`}
      />
      <StatCard
        icon="🍇"
        label="Раундов пройдено"
        value={stats.totalGuesses}
        sub="всего догадок"
      />
      <StatCard
        icon="🏆"
        label="Всего очков"
        value={stats.totalPoints.toLocaleString("ru-RU")}
        sub={`Лучший: ${stats.bestScore}`}
      />
      <StatCard
        icon="⚡"
        label="Винрейт"
        value={`${winRate}%`}
        sub={`${stats.totalWins} из ${stats.totalGames}`}
      />
    </div>
  );
}
