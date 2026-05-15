"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlossyWideButton } from "@/components/ui/glossy-wide-button";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logoError, setLogoError] = useState(false);

  const isLoading = status === "loading";
  const isLoggedIn = !!session?.user;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.refresh();
  };

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

      {/* Логотип — тот же блок, что на первой странице */}
      <div className="w-full max-w-md mx-auto text-center px-1">
        <div className="w-full mb-4 min-h-[80px] flex items-center justify-center">
          {logoError ? (
            <span className="text-7xl block text-center">🍷</span>
          ) : (
            <img
              src="/logo.svg"
              alt=""
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
      </div>

      {isLoading && (
        <div className="mt-12 text-[var(--muted-foreground)]">
          <span className="animate-pulse">⏳</span> Загрузка...
        </div>
      )}

      {/* Хаб: три кнопки для залогиненного пользователя */}
      {!isLoading && isLoggedIn && (
        <div className="mt-12 w-full max-w-md mx-auto flex flex-col gap-4">
          <GlossyWideButton href="/games/wine-quiz">
            🍷 Винная викторина
          </GlossyWideButton>
          <GlossyWideButton href="/games/barramundi">Баррамунди</GlossyWideButton>
          <GlossyWideButton href="/games/wine-nose">Нос вина</GlossyWideButton>
        </div>
      )}

      {/* Кнопки для незалогиненного пользователя */}
      {!isLoading && !isLoggedIn && (
        <div className="mt-12 w-full max-w-md mx-auto flex flex-col gap-4">
          <GlossyWideButton href="/login">🔐 Войти</GlossyWideButton>
          <GlossyWideButton href="/register">📝 Зарегистрироваться</GlossyWideButton>
        </div>
      )}
    </main>
  );
}
