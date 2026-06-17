"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  GlossyWideButton,
  GlossyWideButtonNative,
} from "@/components/ui/glossy-wide-button";

export default function WineQuizPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [totalRounds, setTotalRounds] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const isLoading = status === "loading";
  const isLoggedIn = !!session?.user;

  const handleCreateGame = async () => {
    if (!session?.user?.id) return;

    setCreating(true);
    setError(null);

    try {
      const gameRes = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: session.user.id,
          totalRounds,
          maxPlayers: 99,
        }),
      });

      if (!gameRes.ok) {
        const data = await gameRes.json();
        setError(data.error || "Ошибка создания игры");
        setCreating(false);
        return;
      }

      const { game } = await gameRes.json();
      router.push(`/lobby/${game.id}`);
    } catch {
      setError("Ошибка подключения к серверу");
      setCreating(false);
    }
  };

  const handleJoinByCode = () => {
    const digits = joinCode.replace(/\D/g, "");
    if (!digits) {
      setError("Введите код комнаты");
      return;
    }
    if (digits.length !== 6) {
      setError("Введите 6 цифр кода");
      return;
    }
    router.push(`/join/WN-${digits}`);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.refresh();
  };

  if (!isLoading && !isLoggedIn) {
    router.replace("/login?callbackUrl=/games/wine-quiz");
    return null;
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-[url('/pic/games.png')] bg-cover bg-center bg-no-repeat">
      <div className="fixed top-4 right-4 flex items-center gap-3">
        {isLoggedIn && (
          <button
            onClick={handleSignOut}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--error)] transition-colors"
          >
            Выйти
          </button>
        )}
        <ThemeToggle />
      </div>

      {isLoggedIn && (
        <Link
          href="/profile"
          className="fixed top-4 left-4 flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-xs">
            {session.user.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-[var(--foreground)] font-medium">
            {session.user.name}
          </span>
        </Link>
      )}

      <div className="w-full max-w-md mx-auto text-center space-y-6 px-1">
        <div className="w-full mb-4 min-h-[80px] flex items-center justify-center">
          {logoError ? (
            <span className="text-7xl block text-center">🍷</span>
          ) : (
            <img
              src="/logo.svg"
              alt="Винная Викторина"
              width={448}
              height={307}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="block w-full max-w-full h-auto object-contain"
              style={{ width: "100%", minWidth: "100%" }}
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <h1 className="wine-quiz-page-title text-4xl md:text-6xl font-bold">
          Винная Викторина
        </h1>
      </div>

      {error && (
        <div className="mt-6 bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-6 py-3 rounded-xl text-sm max-w-md text-center">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-12 text-[var(--muted-foreground)]">
          <span className="animate-pulse">⏳</span> Загрузка...
        </div>
      )}

      {!isLoading && isLoggedIn && (
        <>
          <div className="wine-quiz-action-buttons mt-12">
            <GlossyWideButton href="/games/wine-quiz/active">
              Мои активные игры
            </GlossyWideButton>
            <GlossyWideButtonNative
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                setShowJoinInput(false);
              }}
            >
              🚀 Создать игру
            </GlossyWideButtonNative>
            <GlossyWideButtonNative
              onClick={() => {
                setShowJoinInput((prev) => !prev);
                setShowCreateForm(false);
              }}
            >
              📱 Присоединиться
            </GlossyWideButtonNative>
          </div>

          {showCreateForm && (
            <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-lg card-shadow">
              <h3 className="text-lg font-bold mb-4 text-center">
                Настройки игры
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--muted-foreground)] mb-2">
                    Количество раундов (вин для угадывания)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setTotalRounds(Math.max(1, totalRounds - 1))
                      }
                      className="w-10 h-10 bg-[var(--muted)] rounded-xl flex items-center justify-center text-lg font-bold hover:bg-[var(--border)] transition-colors"
                    >
                      −
                    </button>
                    <span className="text-3xl font-bold text-[var(--primary)] min-w-[3rem] text-center">
                      {totalRounds}
                    </span>
                    <button
                      onClick={() =>
                        setTotalRounds(Math.min(20, totalRounds + 1))
                      }
                      className="w-10 h-10 bg-[var(--muted)] rounded-xl flex items-center justify-center text-lg font-bold hover:bg-[var(--border)] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCreateGame}
                  disabled={creating}
                  className="w-full px-6 py-3 text-[var(--primary-foreground)] rounded-xl text-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                  style={{
                    background: creating
                      ? "var(--primary)"
                      : "var(--gradient-primary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(139, 26, 42, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(139, 26, 42, 0.3)";
                    }
                  }}
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Создание...
                    </span>
                  ) : (
                    "🍷 Начать"
                  )}
                </button>
              </div>
            </div>
          )}

          {showJoinInput && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center max-w-md w-full">
              <div className="flex-1 w-full flex items-center bg-[var(--card)] border-2 border-[var(--border)] rounded-xl focus-within:ring-2 focus-within:ring-[var(--primary)]">
                <span className="pl-4 text-lg font-mono text-[var(--muted-foreground)] select-none">
                  WN-
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 min-w-0 px-2 py-3 bg-transparent text-center text-lg font-mono focus:outline-none placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <button
                onClick={handleJoinByCode}
                className="px-6 py-3 text-[var(--primary-foreground)] rounded-xl font-semibold transition-all whitespace-nowrap"
                style={{ background: "var(--gradient-primary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(139, 26, 42, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(139, 26, 42, 0.3)";
                }}
              >
                Войти
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-16 flex gap-6 text-sm text-[var(--muted-foreground)]">
        <Link href="/" className="hover:text-[var(--primary)] transition-colors">
          ← К выбору игр
        </Link>
      </div>
    </main>
  );
}
