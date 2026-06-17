"use client";

import { PROFILE_PANEL_CLASS } from "@/components/profile/profile-panel-styles";
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string;
}

interface ProfileAchievementsProps {
  achievements: Achievement[];
}

export function ProfileAchievements({ achievements }: ProfileAchievementsProps) {
  if (achievements.length === 0) {
    return (
      <div className={`${PROFILE_PANEL_CLASS} p-6`}>
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">
          ⭐ Достижения
        </h2>
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <div className="text-4xl mb-3">🏅</div>
          <p className="font-medium">Пока нет достижений</p>
          <p className="text-sm mt-1">Играйте, чтобы получить первые награды!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${PROFILE_PANEL_CLASS} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          ⭐ Достижения
        </h2>
        <span className="text-sm text-[var(--muted-foreground)]">
          {achievements.length} получено
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="flex items-start gap-3 bg-[var(--muted)] rounded-xl p-3 hover:bg-[var(--border)] transition-colors"
          >
            <div className="text-3xl shrink-0">{achievement.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[var(--foreground)] truncate">
                  {achievement.name}
                </h3>
                <span className="text-[10px] bg-[var(--secondary)] text-[var(--secondary-foreground)] px-1.5 py-0.5 rounded-full shrink-0">
                  +{achievement.xpReward} XP
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
                {achievement.description}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1 opacity-70">
                {new Date(achievement.unlockedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
