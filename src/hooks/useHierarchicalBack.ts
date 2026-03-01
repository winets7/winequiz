"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    // Добавляем «страж»-запись поверх текущей позиции в истории.
    // Благодаря этому нажатие «Назад» переместит указатель истории
    // обратно на текущую страницу и сгенерирует событие popstate,
    // которое мы перехватываем ниже.
    window.history.pushState({ hierarchicalGuard: true }, "");

    const handlePopState = () => {
      router.replace(parentPath);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [parentPath, router]);

  // При программном возврате (кнопка «←», выбор значения) вызываем
  // history.back(), чтобы снять стража; сработает popstate, и handlePopState
  // заменит уже саму страницу на родителя — в стеке не останется дочерней.
  return () => window.history.back();
}
