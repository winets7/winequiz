"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Создать игру
  const handleCreateGame = async () => {
    setCreating(true);
    setError(null);

    try {
      // Создаём гостевого хоста (позже заменим на аутентификацию)
      const userRes = await fetch("/api/users/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Хост" }),
      });

      if (!userRes.ok) {
        setError("Ошибка создания пользователя");
        setCreating(false);
        return;
      }

      const { user } = await userRes.json();

      // Создаём игру
      const gameRes = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: user.id,
          totalRounds: 10,
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

  // Присоединиться по коду
  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Введите код комнаты");
      return;
    }
    // Добавляем префикс если его нет
    const fullCode = code.startsWith("WN-") ? code : `WN-${code}`;
    router.push(`/join/${fullCode}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Кнопка смены темы */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Логотип / Заголовок */}
      <div className="text-center space-y-6">
        <div className="text-7xl mb-4">🍷</div>
        <h1 className="text-4xl md:text-6xl font-bold text-[var(--primary)]">
          Винная Викторина
        </h1>
        <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-md mx-auto">
          Проверь свои знания о вине в увлекательной мультиплеерной викторине!
        </p>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mt-6 bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-6 py-3 rounded-xl text-sm max-w-md text-center">
          {error}
        </div>
      )}

      {/* Кнопки */}
      <div className="mt-12 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleCreateGame}
          disabled={creating}
          className="px-8 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Создание...
            </span>
          ) : (
            "🚀 Создать игру"
          )}
        </button>
        <button
          onClick={() => setShowJoinInput(!showJoinInput)}
          className="px-8 py-4 bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--border)] rounded-2xl text-lg font-semibold hover:bg-[var(--muted)] transition-colors shadow-lg"
        >
          📱 Присоединиться
        </button>
      </div>

      {/* Поле ввода кода */}
      {showJoinInput && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center max-w-md w-full">
          <div className="flex-1 w-full">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
              placeholder="WN-000000"
              maxLength={9}
              className="w-full px-4 py-3 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <button
            onClick={handleJoinByCode}
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Войти
          </button>
        </div>
      )}

      {/* Нижние ссылки */}
      <div className="mt-16 flex gap-6 text-sm text-[var(--muted-foreground)]">
        <a href="/leaderboard" className="hover:text-[var(--primary)] transition-colors">
          🏆 Рейтинг
        </a>
        <a href="/profile" className="hover:text-[var(--primary)] transition-colors">
          👤 Профиль
        </a>
        <a href="/achievements" className="hover:text-[var(--primary)] transition-colors">
          ⭐ Достижения
        </a>
      </div>
    </main>
  );
}
