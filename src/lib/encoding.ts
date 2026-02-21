/**
 * Исправление типичной "кракозябры": строка в UTF-8 была прочитана/сохранена как Latin1 (ISO-8859-1).
 * Каждый байт UTF-8 интерпретировался как один символ (код 0–255).
 * Восстанавливаем: берём коды символов как байты и декодируем как UTF-8.
 */
export function fixMojibakeUtf8Latin1(str: string | null | undefined): string | null {
  if (str == null || typeof str !== "string" || str.length === 0) return str ?? null;
  // Уже нормальная кириллица/Unicode — не трогаем
  if (/[\u0400-\u04FF]/.test(str)) return str;
  try {
    const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded === str) return str;
    if (decoded.includes("\uFFFD") && decoded.length > 2) return str;
    return decoded;
  } catch {
    return str;
  }
}

/**
 * Применяет исправление кодировки к полям ответа раунда (country, grapeVarieties).
 */
export function fixRoundTextFields<T extends { country?: string | null; grapeVarieties?: string[] }>(
  obj: T
): T {
  return {
    ...obj,
    country: fixMojibakeUtf8Latin1(obj.country ?? undefined) ?? obj.country ?? null,
    grapeVarieties: Array.isArray(obj.grapeVarieties)
      ? obj.grapeVarieties.map((s) => fixMojibakeUtf8Latin1(s) ?? s)
      : obj.grapeVarieties,
  };
}
