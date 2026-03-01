"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const GUARD_STATE = { hierarchicalGuard: true } as const;

/**
 * Обеспечивает иерархическую навигацию назад:
 * нативная кнопка «Назад» в браузере и свайп на мобильном
 * всегда ведут на родительскую страницу по иерархии,
 * а не на предыдущую запись в истории.
 *
 * Возвращает функцию goBack, которую нужно вызывать вместо
 * router.push(parentPath), чтобы не накапливать лишние записи в истории.
 *
 * @param parentPath — путь родительской страницы (например /profile/[id] для /play/[gameId])
 * @param options.enabled — если false, guard не добавляется (например пока страница в LOADING)
 */
export function useHierarchicalBack(
  parentPath: string,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const router = useRouter();
  const parentPathRef = useRef(parentPath);
  parentPathRef.current = parentPath;

  useEffect(() => {
    if (!enabled) return;

    const pushGuard = () => {
      const url = window.location.pathname + window.location.search;
      window.history.pushState(GUARD_STATE, "", url);
    };

    // Отложенная вставка guard: после того как Next.js завершит свою работу с историей,
    // иначе клиентская навигация может перезаписать нашу запись.
    const t = setTimeout(pushGuard, 0);

    const handlePopState = (e: PopStateEvent) => {
      const path = parentPathRef.current;
      window.history.replaceState(null, "", path);
      router.replace(path);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router, enabled]);

  return () => window.history.back();
}
