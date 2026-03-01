"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Обеспечивает иерархическую навигацию назад:
 * нативная кнопка «Назад» в браузере и свайп на мобильном
 * всегда ведут на родительскую страницу по иерархии,
 * а не на предыдущую запись в истории.
 *
 * Возвращает функцию goBack, которую нужно вызывать вместо
 * router.push(parentPath), чтобы не накапливать лишние записи в истории.
 */
export function useHierarchicalBack(parentPath: string) {
  const router = useRouter();
  const parentPathRef = useRef(parentPath);
  parentPathRef.current = parentPath;

  useEffect(() => {
    // Добавляем «страж»-запись поверх текущей позиции в истории.
    // Благодаря этому нажатие «Назад» переместит указатель истории
    // обратно на текущую страницу и сгенерирует событие popstate,
    // которое мы перехватываем ниже.
    window.history.pushState({ hierarchicalGuard: true }, "");

    const handlePopState = () => {
      const path = parentPathRef.current;
      // Сначала заменяем текущую запись в истории на родителя через History API,
      // иначе Next.js router.replace() может добавить новую запись вместо замены.
      window.history.replaceState(null, "", path);
      router.replace(path);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // Не добавляем parentPath в зависимости: используем ref, чтобы при смене
    // (например, когда подгрузился userId на /play/[gameId]) не перезапускать
    // эффект. Иначе снимается слушатель popstate, и свайп ведёт на предыдущую
    // запись в истории (например /play/[gameId]/select/...) вместо /profile/[id].
  }, [router]);

  // При программном возврате (кнопка «←», выбор значения) вызываем
  // history.back(), чтобы снять стража; сработает popstate, и handlePopState
  // заменит уже саму страницу на родителя — в стеке не останется дочерней.
  return () => window.history.back();
}
