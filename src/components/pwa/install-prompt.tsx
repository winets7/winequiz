"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BrowserType = "chromium" | "ios-safari" | "firefox" | "yandex" | "other";

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;

  // iOS (любой браузер на iOS использует WebKit)
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios-safari";
  }

  // Яндекс Браузер (до проверки Chrome, т.к. UA содержит оба)
  if (/YaBrowser/i.test(ua)) {
    return "yandex";
  }

  // Firefox на Android/Desktop
  if (/Firefox/i.test(ua) && !/Seamonkey/i.test(ua)) {
    return "firefox";
  }

  // Chromium-based (Chrome, Edge, Samsung Internet, Opera)
  if (/Chrome|CriOS|Edg|SamsungBrowser|OPR/i.test(ua)) {
    return "chromium";
  }

  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true)
  );
}

function isDismissed(): boolean {
  const dismissed = localStorage.getItem("pwa-install-dismissed");
  if (!dismissed) return false;
  const dismissedAt = parseInt(dismissed, 10);
  // Показываем снова через 7 дней
  return Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>("other");

  useEffect(() => {
    // Уже установлено как приложение
    if (isStandalone()) return;
    // Пользователь закрыл баннер недавно
    if (isDismissed()) return;

    const detectedBrowser = detectBrowser();
    setBrowser(detectedBrowser);

    if (detectedBrowser === "chromium") {
      // Chromium — ждём beforeinstallprompt с фолбэком
      let promptReceived = false;

      const handler = (e: Event) => {
        e.preventDefault();
        promptReceived = true;
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setTimeout(() => setShowBanner(true), 3000);
      };

      window.addEventListener("beforeinstallprompt", handler);
      window.addEventListener("appinstalled", () => {
        setShowBanner(false);
        setDeferredPrompt(null);
      });

      // Фолбэк: если за 5 сек событие не пришло — показываем ручную инструкцию
      const fallbackTimer = setTimeout(() => {
        if (!promptReceived) {
          setBrowser("other");
          setShowBanner(true);
        }
      }, 5000);

      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    } else {
      // iOS Safari, Firefox, Яндекс, другие — показываем инструкцию
      setTimeout(() => setShowBanner(true), 3000);
    }
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

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div
        className="max-w-md mx-auto rounded-2xl shadow-2xl p-4 border"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {browser === "chromium" ? (
          <ChromiumBanner
            onInstall={handleInstall}
            onDismiss={handleDismiss}
          />
        ) : browser === "ios-safari" ? (
          <IOSBanner onDismiss={handleDismiss} />
        ) : browser === "firefox" ? (
          <FirefoxBanner onDismiss={handleDismiss} />
        ) : browser === "yandex" ? (
          <YandexBanner onDismiss={handleDismiss} />
        ) : (
          <GenericBanner onDismiss={handleDismiss} />
        )}
      </div>
    </div>
  );
}

/* ====== Баннеры для разных браузеров ====== */

function ChromiumBanner({
  onInstall,
  onDismiss,
}: {
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <AppIcon />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
          Установить приложение
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Добавьте на главный экран для быстрого доступа
        </p>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={onInstall}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--primary, #722F37)" }}
        >
          Установить
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-1 text-xs transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          Не сейчас
        </button>
      </div>
    </div>
  );
}

function IOSBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <AppIcon />
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Установите приложение
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Нажмите{" "}
            <span className="inline-flex items-center">
              <IOSShareIcon />
            </span>{" "}
            <strong>Поделиться</strong>, затем{" "}
            <strong>«На экран Домой»</strong>
          </p>
        </div>
      </div>
      {/* Визуальная инструкция */}
      <div
        className="mt-3 flex items-center justify-center gap-4 py-3 px-4 rounded-xl text-sm"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <span className="flex flex-col items-center gap-1">
          <IOSShareIcon size={24} />
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Поделиться
          </span>
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>→</span>
        <span className="flex flex-col items-center gap-1">
          <span className="text-xl">➕</span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            На экран Домой
          </span>
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="mt-3 w-full text-center py-2 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        Понятно, спасибо
      </button>
    </div>
  );
}

function FirefoxBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <AppIcon />
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Установите приложение
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Нажмите <strong>⋮</strong> (меню), затем{" "}
            <strong>«Установить»</strong> или{" "}
            <strong>«Добавить на главный экран»</strong>
          </p>
        </div>
      </div>
      {/* Визуальная инструкция */}
      <div
        className="mt-3 flex items-center justify-center gap-4 py-3 px-4 rounded-xl text-sm"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <span className="flex flex-col items-center gap-1">
          <span className="text-xl">⋮</span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Меню
          </span>
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>→</span>
        <span className="flex flex-col items-center gap-1">
          <span className="text-xl">📲</span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Установить
          </span>
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="mt-3 w-full text-center py-2 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        Понятно, спасибо
      </button>
    </div>
  );
}

function YandexBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <AppIcon />
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            Установите приложение
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Нажмите <strong>⋮</strong> (меню), затем{" "}
            <strong>«Добавить на главный экран»</strong>
          </p>
        </div>
      </div>
      {/* Визуальная инструкция */}
      <div
        className="mt-3 flex items-center justify-center gap-4 py-3 px-4 rounded-xl text-sm"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <span className="flex flex-col items-center gap-1">
          <span className="text-xl">⋮</span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Меню
          </span>
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>→</span>
        <span className="flex flex-col items-center gap-1">
          <span className="text-xl">📲</span>
          <span className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
            Добавить на<br />главный экран
          </span>
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="mt-3 w-full text-center py-2 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        Понятно, спасибо
      </button>
    </div>
  );
}

function GenericBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <AppIcon />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
          Установите приложение
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Откройте меню браузера и выберите «Добавить на главный экран»
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 px-3 py-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        ✕
      </button>
    </div>
  );
}

/* ====== Общие компоненты ====== */

function AppIcon() {
  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
      style={{ backgroundColor: "var(--muted)" }}
    >
      🍷
    </div>
  );
}

function IOSShareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--primary, #722F37)", display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
