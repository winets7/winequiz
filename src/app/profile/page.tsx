"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileAchievements } from "@/components/profile/profile-achievements";

interface ProfileData {
  user: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    level: number;
    xp: number;
    createdAt: string;
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
    totalGuesses: number;
    totalPoints: number;
    bestScore: number;
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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${session!.user.id}/profile`);
        if (!res.ok) {
          setError("Не удалось загрузить профиль");
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
  }, [session, status, router]);

  if (status === "loading" || loading) {
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
            👤 Профиль
          </h1>
          <ThemeToggle />
        </div>
      </div>

      {/* Контент профиля */}
      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        <ProfileHeader user={profile.user} isOwnProfile={true} />
        <ProfileStats stats={profile.stats} />
        <ProfileGames
          hostedGames={profile.hostedGames}
          participatedGames={profile.participatedGames}
        />
        <ProfileAchievements achievements={profile.achievements} />
      </div>
    </main>
  );
}
