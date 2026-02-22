/**
 * Исправление "кракозябры" для текста, который изначально был в UTF-8,
 * но был прочитан/сохранён в другой кодировке (Latin1 или Windows-1251).
 *
 * 1) Latin1: каждый байт UTF-8 интерпретировался как один символ (код 0–255).
 * 2) CP1251: байты UTF-8 интерпретировались как Windows-1251 (типично на Windows).
 */

// Таблица Windows-1251: индекс 0..127 → кодовая точка для байта 0x80..0xFF (Encoding Standard)
const CP1251_INDEX_TO_CODE: number[] = [
  0x0402, 0x0403, 0x201a, 0x0453, 0x201e, 0x2026, 0x2020, 0x2021, 0x20ac, 0x2030,
  0x0409, 0x2039, 0x040a, 0x040c, 0x040b, 0x040f, 0x0452, 0x2018, 0x2019, 0x201c,
  0x201d, 0x2022, 0x2013, 0x2014, 0x0098, 0x2122, 0x0459, 0x203a, 0x045a, 0x045c,
  0x045b, 0x045f, 0x00a0, 0x040e, 0x045e, 0x0408, 0x00a4, 0x0490, 0x00a6, 0x00a7,
  0x0401, 0x00a9, 0x0404, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x0407, 0x00b0, 0x00b1,
  0x0406, 0x0456, 0x0491, 0x00b5, 0x00b6, 0x00b7, 0x0451, 0x2116, 0x0454, 0x00bb,
  0x0458, 0x0405, 0x0455, 0x0457, 0x0410, 0x0411, 0x0412, 0x0413, 0x0414, 0x0415,
  0x0416, 0x0417, 0x0418, 0x0419, 0x041a, 0x041b, 0x041c, 0x041d, 0x041e, 0x041f,
  0x0420, 0x0421, 0x0422, 0x0423, 0x0424, 0x0425, 0x0426, 0x0427, 0x0428, 0x0429,
  0x042a, 0x042b, 0x042c, 0x042d, 0x042e, 0x042f, 0x0430, 0x0431, 0x0432, 0x0433,
  0x0434, 0x0435, 0x0436, 0x0437, 0x0438, 0x0439, 0x043a, 0x043b, 0x043c, 0x043d,
  0x043e, 0x043f, 0x0440, 0x0441, 0x0442, 0x0443, 0x0444, 0x0445, 0x0446, 0x0447,
  0x0448, 0x0449, 0x044a, 0x044b, 0x044c, 0x044d, 0x044e, 0x044f,
];

const CP1251_CODE_TO_BYTE: Map<number, number> = new Map(
  CP1251_INDEX_TO_CODE.map((code, i) => [code, 0x80 + i])
);

function countCyrillic(str: string): number {
  let n = 0;
  for (const c of str) {
    const code = c.charCodeAt(0);
    if (code >= 0x0400 && code <= 0x04ff) n++;
  }
  return n;
}

/** Строка выглядит как валидный русский текст (почти вся кириллица/пробелы/знаки). */
function looksLikeValidRussian(str: string): boolean {
  if (str.length === 0) return true;
  let cyrillicOrSpace = 0;
  for (const c of str) {
    const code = c.charCodeAt(0);
    if ((code >= 0x0400 && code <= 0x04ff) || code <= 0x007f) cyrillicOrSpace++;
  }
  return cyrillicOrSpace / str.length >= 0.9;
}

/**
 * Пытается восстановить строку, если она была прочитана как CP1251 вместо UTF-8.
 * Каждый символ интерпретируется как результат декодирования одного байта в CP1251;
 * получаем байты и декодируем их как UTF-8.
 */
function fixMojibakeUtf8Cp1251(str: string): string | null {
  const bytes: number[] = [];
  for (const c of str) {
    const code = c.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else {
      const byte = CP1251_CODE_TO_BYTE.get(code);
      if (byte === undefined) return null;
      bytes.push(byte);
    }
  }
  try {
    const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    if (decoded.includes("\uFFFD")) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Latin1: коды символов (0–255) трактуем как байты и декодируем как UTF-8.
 */
function fixMojibakeUtf8Latin1(str: string): string | null {
  try {
    const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded.includes("\uFFFD") && decoded.length > 2) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function fixMojibake(str: string | null | undefined): string | null {
  if (str == null || typeof str !== "string" || str.length === 0) return str ?? null;

  // Уже похоже на нормальный русский — не трогаем
  if (looksLikeValidRussian(str)) return str;

  // 1) Пробуем CP1251 (типичная кракозябра на Windows: Р¤СЂР°...)
  const fromCp1251 = fixMojibakeUtf8Cp1251(str);
  if (fromCp1251 != null && looksLikeValidRussian(fromCp1251)) return fromCp1251;

  // 2) Пробуем Latin1
  const fromLatin1 = fixMojibakeUtf8Latin1(str);
  if (fromLatin1 != null) {
    if (fromLatin1.includes("\uFFFD")) return str;
    if (looksLikeValidRussian(fromLatin1) || countCyrillic(fromLatin1) > countCyrillic(str))
      return fromLatin1;
    if (fromLatin1.length < str.length && countCyrillic(fromLatin1) > 0) return fromLatin1;
  }

  return str;
}

/**
 * Применяет исправление кодировки к полям ответа раунда (country, grapeVarieties и др. текстовые поля).
 */
export function fixRoundTextFields<T extends {
  country?: string | null;
  grapeVarieties?: string[] | null;
  color?: string | null;
  sweetness?: string | null;
  composition?: string | null;
}>(
  obj: T
): T {
  const fix = (s: string | null | undefined) => fixMojibake(s) ?? s ?? null;
  return {
    ...obj,
    country: fix(obj.country ?? undefined) ?? obj.country ?? null,
    grapeVarieties: Array.isArray(obj.grapeVarieties)
      ? obj.grapeVarieties.map((s) => fix(s) ?? s)
      : obj.grapeVarieties,
    color: fix(obj.color ?? undefined) ?? obj.color ?? null,
    sweetness: fix(obj.sweetness ?? undefined) ?? obj.sweetness ?? null,
    composition: fix(obj.composition ?? undefined) ?? obj.composition ?? null,
  };
}
