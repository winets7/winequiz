"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Обеспечивает иерархическую навигацию назад:
 * нативная кнопка «Назад» в браузере и свайп на мобильном
 * всегда ведут на родительскую страницу по иерархии,
 * а не на предыдущую запись в истории.
 *
 * При открытии страницы в историю записывается родительский путь,
 * чтобы при свайпе назад переход шёл на него.
 *
 * Возвращает функцию goBack, которую нужно вызывать вместо
 * router.push(parentPath), чтобы не накапливать лишние записи в истории.
 *
 * @param parentPath — путь родительской страницы (например /play/[gameId] для /play/[gameId]/select/*)
 * @param options.enabled — если false, запись в историю не делается (например пока страница в LOADING)
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

    const writeParentIntoHistory = () => {
      const currentUrl = window.location.pathname + window.location.search;
      // Подменяем текущую запись на родителя, затем снова пушим текущую страницу —
      // в стеке получается [..., parentPath, currentUrl], свайп назад ведёт на parentPath.
      window.history.replaceState(null, "", parentPathRef.current);
      window.history.pushState(null, "", currentUrl);
    };

    // Отложенно, чтобы Next.js успел завершить работу с историей.
    const t = setTimeout(writeParentIntoHistory, 0);

    const handlePopState = () => {
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
