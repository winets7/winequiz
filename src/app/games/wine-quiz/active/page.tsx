"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface ActiveGame {
  id: string;
  code: string;
  status: string;
  totalRounds: number;
  currentRound: number;
  createdAt: string;
  playersCount: number;
}

type TabId = "participant" | "organizer";

function statusLabel(status: string): string {
  if (status === "WAITING") return "Ожидание";
  if (status === "PLAYING") return "Идёт игра";
  return status;
}

function statusBadgeClass(status: string): string {
  if (status === "WAITING")
    return "bg-[var(--secondary)] text-[var(--secondary-foreground)]";
  if (status === "PLAYING")
    return "bg-[var(--primary)] text-[var(--primary-foreground)]";
  return "bg-[var(--muted)] text-[var(--muted-foreground)]";
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyActiveGamesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<TabId>("participant");
  const [asOrganizer, setAsOrganizer] = useState<ActiveGame[]>([]);
  const [asParticipant, setAsParticipant] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";
  const isLoggedIn = !!session?.user;

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/games/active", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?callbackUrl=/games/wine-quiz/active");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось загрузить игры");
        return;
      }
      const data = await res.json();
      setAsOrganizer(data.asOrganizer ?? []);
      setAsParticipant(data.asParticipant ?? []);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace("/login?callbackUrl=/games/wine-quiz/active");
      return;
    }
    load();
  }, [isLoading, isLoggedIn, load, router]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.refresh();
  };

  const navigateToGame = (game: ActiveGame, role: TabId) => {
    if (role === "organizer") {
      router.push(`/lobby/${game.id}`);
    } else {
      router.push(`/join/${game.code}`);
    }
  };

  const list = tab === "participant" ? asParticipant : asOrganizer;

  if (isLoading || (!loading && !isLoggedIn)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-[var(--muted-foreground)]">
          <span className="animate-pulse">⏳</span> Загрузка...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col pb-10 px-4 pt-4">
      <div className="fixed top-4 right-4 z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--error)] transition-colors"
        >
          Выйти
        </button>
        <ThemeToggle />
      </div>

      {isLoggedIn && (
        <Link
          href="/profile"
          className="fixed top-4 left-4 z-10 flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-xs">
            {session!.user.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-[var(--foreground)] font-medium max-w-[140px] truncate">
            {session!.user.name}
          </span>
        </Link>
      )}

      <div className="w-full max-w-md mx-auto mt-14 flex flex-col gap-6">
        <div>
          <Link
            href="/games/wine-quiz"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            ← К винной викторине
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[var(--primary)]">
            Мои активные игры
          </h1>
        </div>

        <div className="flex rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("participant")}
            className={`flex-1 py-3 px-3 text-sm font-semibold rounded-xl transition-colors ${
              tab === "participant"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Я как участник
            {asParticipant.length > 0 && (
              <span className="ml-1 text-xs opacity-90">
                ({asParticipant.length})
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("organizer")}
            className={`flex-1 py-3 px-3 text-sm font-semibold rounded-xl transition-colors ${
              tab === "organizer"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Я как организатор
            {asOrganizer.length > 0 && (
              <span className="ml-1 text-xs opacity-90">
                ({asOrganizer.length})
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--error)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center text-[var(--muted-foreground)] py-8">
            <span className="animate-pulse">⏳</span> Загрузка списка...
          </p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-6 py-10 text-center text-[var(--muted-foreground)]">
            <p className="font-medium text-[var(--foreground)]">
              Нет активных игр
            </p>
            <p className="mt-2 text-sm">
              {tab === "participant"
                ? "Присоединитесь к комнате по коду на странице викторины."
                : "Создайте новую игру — она появится здесь."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => navigateToGame(game, tab)}
                  className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-md hover:bg-[var(--muted)] hover:border-[var(--primary)]/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-[var(--primary)]">
                      {game.code}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(game.status)}`}
                    >
                      {statusLabel(game.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                    <span>Раунд {game.currentRound} / {game.totalRounds}</span>
                    <span>👥 {game.playersCount}</span>
                    <span>{formatShortDate(game.createdAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
