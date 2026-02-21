/**
 * Генерация уникального кода игровой комнаты
 * Формат: WN-XXXXXX (6 цифр)
 */
export function generateGameCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return `WN-${code}`;
}

/**
 * Валидация формата кода комнаты
 */
export function isValidGameCode(code: string): boolean {
  return /^WN-\d{6}$/.test(code);
}

/**
 * Получить URL для подключения к игре
 */
export function getJoinUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/join/${code}`;
}
