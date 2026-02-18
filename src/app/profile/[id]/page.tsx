"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileAchievements } from "@/components/profile/profile-achievements";
import { ProfilePrivacy } from "@/components/profile/profile-privacy";

interface ProfileData {
  user: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    level: number;
    xp: number;
    createdAt: string;
    isProfilePublic?: boolean;
  };
  hostedGames: Array<{
    id: string;
    code: string;
    status: string;
    totalRounds: number;
    createdAt: string;
    finishedAt: string | null;
    playersCount: number;
    players: Array<{
      id: string;
      score: number;
      position: number | null;
      user: { id: string; name: string; avatar: string | null };
    }>;
  }>;
  participatedGames: Array<{
    id: string;
    code: string;
    status: string;
    totalRounds: number;
    createdAt: string;
    finishedAt: string | null;
    host: { id: string; name: string; avatar: string | null };
    playersCount: number;
    players: Array<{
      id: string;
      score: number;
      position: number | null;
      user: { id: string; name: string; avatar: string | null };
    }>;
    myScore: number;
    myPosition: number | null;
  }>;
  stats: {
    totalGames: number;
    plannedGames: number;
    totalWins: number;
    totalRounds: number;
    totalPoints: number;
    bestScore: number;
    maxPossiblePoints: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
    unlockedAt: string;
  }>;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: session } = useSession();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = session?.user?.id === userId;

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}/profile`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Не удалось загрузить профиль");
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch {
        setError("Ошибка подключения к серверу");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍷</div>
          <p className="text-[var(--muted-foreground)]">Загрузка профиля...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-xl text-[var(--error)]">{error || "Профиль не найден"}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl"
          >
            На главную
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Верхняя панель */}
      <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm flex items-center gap-1"
          >
            ← На главную
          </Link>
          <h1 className="text-lg font-bold text-[var(--primary)]">
            👤 {profile.user.name}
          </h1>
          <ThemeToggle />
        </div>
      </div>

      {/* Контент профиля */}
      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        <ProfileHeader user={profile.user} isOwnProfile={isOwnProfile} />
        {isOwnProfile && (
          <ProfilePrivacy userId={profile.user.id} initialIsPublic={profile.user.isProfilePublic ?? false} />
        )}
        <ProfileStats stats={profile.stats} isHost={isOwnProfile} />
        <ProfileGames
          hostedGames={profile.hostedGames}
          participatedGames={profile.participatedGames}
        />
        <ProfileAchievements achievements={profile.achievements} />
      </div>
    </main>
  );
}
