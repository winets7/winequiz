"use client";

import { PROFILE_PANEL_CLASS } from "@/components/profile/profile-panel-styles";

import { useState } from "react";

interface ProfilePrivacyProps {
  userId: string;
  initialIsPublic: boolean;
}

export function ProfilePrivacy({ userId, initialIsPublic }: ProfilePrivacyProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/profile/privacy`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isProfilePublic: checked }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка обновления настройки");
      }

      const data = await res.json();
      setIsPublic(data.isProfilePublic);
    } catch (error) {
      console.error("Ошибка обновления приватности:", error);
      // Возвращаем предыдущее значение при ошибке
      setIsPublic(!checked);
      alert(error instanceof Error ? error.message : "Не удалось обновить настройку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${PROFILE_PANEL_CLASS} p-6`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            🔒 Настройки приватности
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Управляйте видимостью вашего профиля для других пользователей
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={loading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[var(--muted)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
        </label>
      </div>
      <div className="mt-3 pt-3 border-t-2 border-[var(--wine-quiz-active-game-card-border)]">
        <p className="text-xs text-[var(--muted-foreground)]">
          {isPublic
            ? "✅ Ваш профиль виден всем пользователям"
            : "🔒 Ваш профиль скрыт от других пользователей"}
        </p>
      </div>
    </div>
  );
}
