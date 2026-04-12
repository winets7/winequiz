"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { applyPhoneMask, normalizePhone, isValidPhone } from "@/lib/phone";
import { sanitizeAuthCallbackUrl } from "@/lib/auth-callback";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(applyPhoneMask(e.target.value));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      setError("Введите корректный номер телефона");
      return;
    }

    if (!password) {
      setError("Введите пароль");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        phone: normalizedPhone,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Неверный номер телефона или пароль");
        setLoading(false);
        return;
      }

      // Полная перезагрузка: cookie сессии из ответа signIn гарантированно подхватывается
      // (router.push + refresh часто оставляют клиент без обновлённой сессии).
      const params = new URLSearchParams(window.location.search);
      const next = sanitizeAuthCallbackUrl(params.get("callbackUrl"));
      window.location.assign(next);
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
        <h1 className="text-3xl font-bold text-[var(--primary)]">Вход</h1>
        <p className="text-[var(--muted-foreground)] mt-2">
          Войдите, чтобы продолжить
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
            placeholder="Введите пароль"
            className="w-full px-4 py-3 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Кнопка входа */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Вход...
            </span>
          ) : (
            "Войти"
          )}
        </button>
      </form>

      {/* Ссылки */}
      <div className="mt-6 text-center space-y-3">
        <p className="text-[var(--muted-foreground)] text-sm">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="text-[var(--primary)] font-semibold hover:underline"
          >
            Зарегистрироваться
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
