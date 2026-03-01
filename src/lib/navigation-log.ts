/**
 * Логирование переходов и возвратов для отладки и аналитики.
 * Все события пишутся в console; позже можно добавить отправку на бэкенд.
 */

export type NavigationLogEvent =
  | { type: "navigate"; from: string; to: string }
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
