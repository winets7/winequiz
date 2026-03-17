"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
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

        {/* Для гостей — заголовок и описание */}
        {!isLoggedIn && (
          <>
            <h1 className="text-4xl md:text-6xl font-bold text-[var(--primary)]">
              Винная Викторина
            </h1>
            <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-md mx-auto mt-6">
              Проверь свои знания о вине в увлекательной мультиплеерной
              викторине!
            </p>
          </>
        )}
      </div>

      {isLoading && (
        <div className="mt-12 text-[var(--muted-foreground)]">
          <span className="animate-pulse">⏳</span> Загрузка...
        </div>
      )}

      {/* Хаб: три кнопки для залогиненного пользователя */}
      {!isLoading && isLoggedIn && (
        <div className="mt-12 w-full max-w-md mx-auto flex flex-col gap-4">
          <Link
            href="/games/wine-quiz"
            className="px-8 py-4 text-[var(--primary-foreground)] rounded-2xl text-lg font-semibold transition-all shadow-lg text-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            🍷 Винная викторина
          </Link>
          <Link
            href="/games/barramundi"
            className="px-8 py-4 bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--border)] rounded-2xl text-lg font-semibold hover:bg-[var(--muted)] transition-all shadow-lg text-center"
          >
            Баррамунди
          </Link>
          <Link
            href="/games/wine-nose"
            className="px-8 py-4 bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--border)] rounded-2xl text-lg font-semibold hover:bg-[var(--muted)] transition-all shadow-lg text-center"
          >
            Нос вина
          </Link>
        </div>
      )}

      {/* Кнопки для незалогиненного пользователя */}
      {!isLoading && !isLoggedIn && (
        <div className="mt-12 w-full max-w-md mx-auto flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="px-8 py-4 text-[var(--primary-foreground)] rounded-2xl text-lg font-semibold transition-all shadow-lg text-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            🔐 Войти
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--border)] rounded-2xl text-lg font-semibold hover:bg-[var(--muted)] transition-colors shadow-lg text-center"
          >
            📝 Зарегистрироваться
          </Link>
        </div>
      )}

      <div className="mt-16 flex gap-6 text-sm text-[var(--muted-foreground)]">
        {isLoggedIn && (
          <Link
            href="/profile"
            className="hover:text-[var(--primary)] transition-colors"
          >
            👤 Профиль
          </Link>
        )}
      </div>
    </main>
  );
}
