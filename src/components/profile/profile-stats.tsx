"use client";

interface ProfileStatsProps {
  stats: {
    totalGames: number;
    plannedGames: number;
    totalWins: number;
    totalRounds: number;
    totalPoints: number;
    bestScore: number;
    maxPossiblePoints: number;
  };
  isHost?: boolean; // Является ли пользователь хостом (для отображения виджета "Запланировано")
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

export function ProfileStats({ stats, isHost = false }: ProfileStatsProps) {
  // Винрейт = отношение набранных очков к максимально возможным очкам
  const winRate = stats.maxPossiblePoints > 0
    ? Math.round((stats.totalPoints / stats.maxPossiblePoints) * 100)
    : 0;

  // Виджет "Запланировано" показываем только хосту
  const cards = [
    ...(isHost ? [{
      icon: "📋",
      label: "Запланировано",
      value: stats.plannedGames,
      sub: "в ожидании"
    }] : []),
    {
      icon: "🍷",
      label: "Игр сыграно",
      value: stats.totalGames,
      sub: `${stats.totalWins} побед`
    },
    {
      icon: "🍇",
      label: "Раундов пройдено",
      value: stats.totalRounds,
      sub: "всего раундов"
    },
    {
      icon: "🏆",
      label: "Всего очков",
      value: stats.totalPoints.toLocaleString("ru-RU"),
      sub: `Лучший: ${stats.bestScore}`
    },
    {
      icon: "⚡",
      label: "Винрейт",
      value: `${winRate}%`,
      sub: `${stats.totalPoints} из ${stats.maxPossiblePoints}`
    }
  ];

  // Определяем количество колонок в зависимости от количества карточек
  const gridCols = isHost ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-4";

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {cards.map((card, index) => (
        <StatCard
          key={index}
          icon={card.icon}
          label={card.label}
          value={card.value}
          sub={card.sub}
        />
      ))}
    </div>
  );
}
