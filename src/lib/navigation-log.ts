/**
 * Логирование переходов и возвратов для отладки и аналитики.
 * Все события пишутся в console с префиксом [navigation].
 * В DevTools: фильтр по "navigation" или "history_write" — увидите, какая страница записалась в историю.
 */

export type NavigationLogEvent =
  | { type: "navigate"; from: string; to: string }
  | {
      type: "history_write";
      /** Путь родителя, записанный в историю перед текущей страницей */
      parentPath: string;
      /** Текущий URL, записанный в историю (дочерняя страница) */
      currentUrl: string;
      /** Длина стека истории после записи (для отладки) */
      historyLength: number;
    }
  | {
      type: "back_popstate";
      from: string;
      to: string;
    }
  | {
      type: "back_button";
      from: string;
      to: string;
    }
  | {
      type: "back_error";
      from: string;
      to: string;
      error: unknown;
    };

function getTimestamp(): string {
  return new Date().toISOString();
}

export function logNavigation(event: NavigationLogEvent): void {
  const payload = { ...event, timestamp: getTimestamp() };
  if (event.type === "back_error") {
    console.error("[navigation]", payload, event.error);
  } else {
    console.log("[navigation]", payload);
  }
}
