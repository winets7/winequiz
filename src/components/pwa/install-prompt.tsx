"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, не установлено ли уже приложение
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Проверяем, не закрыл ли пользователь баннер ранее
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Показываем снова через 7 дней
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Показываем баннер через 3 секунды после загрузки
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Слушаем успешную установку
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div
        className="max-w-md mx-auto rounded-2xl shadow-2xl p-4 flex items-center gap-4 border"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Иконка */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
          style={{ backgroundColor: "var(--muted)" }}
        >
          🍷
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--foreground)" }}
          >
            Установить приложение
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            Добавьте на главный экран для быстрого доступа
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--primary, #722F37)" }}
          >
            Установить
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-1 text-xs transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            Не сейчас
          </button>
        </div>
      </div>
    </div>
  );
}
