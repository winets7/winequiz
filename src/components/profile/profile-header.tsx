"use client";

interface ProfileHeaderProps {
  user: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    level: number;
    xp: number;
    createdAt: string;
  };
  isOwnProfile: boolean;
}

/** XP, необходимый для следующего уровня */
function xpForLevel(level: number): number {
  return level * 100;
}

export function ProfileHeader({ user, isOwnProfile }: ProfileHeaderProps) {
  const xpNeeded = xpForLevel(user.level);
  const xpProgress = Math.min((user.xp / xpNeeded) * 100, 100);
  const memberSince = new Date(user.createdAt).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-[var(--card)] rounded-3xl p-6 md:p-8 shadow-lg border border-[var(--border)]">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Аватар */}
        <div className="relative">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-3xl md:text-4xl font-bold shadow-lg">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          {/* Бейдж уровня */}
          <div className="absolute -bottom-1 -right-1 bg-[var(--secondary)] text-[var(--secondary-foreground)] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow">
            {user.level}
          </div>
        </div>

        {/* Имя и инфо */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
              {user.name}
            </h1>
            {user.role === "ADMIN" && (
              <span className="inline-block bg-[var(--secondary)] text-[var(--secondary-foreground)] text-xs px-2 py-0.5 rounded-full font-semibold">
                👑 Админ
              </span>
            )}
            {isOwnProfile && (
              <span className="inline-block text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">
                Это вы
              </span>
            )}
          </div>

          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            С нами с {memberSince}
          </p>

          {/* XP прогресс-бар */}
          <div className="mt-3 max-w-xs mx-auto sm:mx-0">
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-1">
              <span>Уровень {user.level}</span>
              <span>{user.xp} / {xpNeeded} XP</span>
            </div>
            <div className="w-full bg-[var(--muted)] rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-[var(--secondary)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
