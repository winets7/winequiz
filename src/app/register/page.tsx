"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { applyPhoneMask, normalizePhone, isValidPhone } from "@/lib/phone";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(applyPhoneMask(e.target.value));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // --- Валидация ---

    if (!name.trim()) {
      setError("Введите ваше имя");
      return;
    }

    if (name.trim().length > 20) {
      setError("Имя слишком длинное (макс. 20 символов)");
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      setError("Введите корректный номер телефона");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try {
      // 1. Регистрация
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizedPhone,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      // 2. Автоматический вход после регистрации
      const signInResult = await signIn("credentials", {
        phone: normalizedPhone,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Регистрация прошла, но вход не удался — отправляем на страницу входа
        router.push("/login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Ошибка подключения к серверу");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Кнопка смены темы */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Логотип */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🍷</div>
        <h1 className="text-3xl font-bold text-[var(--primary)]">Регистрация</h1>
        <p className="text-[var(--muted-foreground)] mt-2">
          Создайте аккаунт для игры
        </p>
      </div>

      {/* Форма */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
        {/* Ошибка */}
        {error && (
          <div className="bg-[var(--card)] border border-[var(--error)] text-[var(--error)] px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Имя */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Ваше имя
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Как вас называть?"
            maxLength={20}
            className="w-full px-4 py-3 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Телефон */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Номер телефона
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="8 (___) ___-__-__"
            maxLength={18}
            className="w-full px-4 py-3 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Пароль */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Минимум 6 символов"
            className="w-full px-4 py-3 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Подтверждение пароля */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Подтвердите пароль
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            placeholder="Повторите пароль"
            className="w-full px-4 py-3 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Кнопка регистрации */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Регистрация...
            </span>
          ) : (
            "Создать аккаунт"
          )}
        </button>
      </form>

      {/* Ссылки */}
      <div className="mt-6 text-center space-y-3">
        <p className="text-[var(--muted-foreground)] text-sm">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="text-[var(--primary)] font-semibold hover:underline"
          >
            Войти
          </Link>
        </p>
        <Link
          href="/"
          className="inline-block text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors"
        >
          ← На главную
        </Link>
      </div>
    </main>
  );
}
