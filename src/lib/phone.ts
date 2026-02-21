/**
 * Утилиты для работы с номером телефона
 * Формат: 8 (XXX) XXX-XX-XX
 */

/**
 * Нормализует номер телефона — оставляет только цифры, приводит к формату 8XXXXXXXXXX
 * Пример: "8 (912) 345-67-89" → "89123456789"
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Если начинается с 7 и длина 11 — заменяем на 8
  if (digits.startsWith("7") && digits.length === 11) {
    return "8" + digits.slice(1);
  }

  // Если начинается с 8 и длина 11 — уже ок
  if (digits.startsWith("8") && digits.length === 11) {
    return digits;
  }

  // Если 10 цифр без 8 — добавляем 8
  if (digits.length === 10) {
    return "8" + digits;
  }

  return digits;
}

/**
 * Форматирует номер телефона для отображения: 8 (XXX) XXX-XX-XX
 * Вход: "89123456789" → "8 (912) 345-67-89"
 */
export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length !== 11) return phone;

  return `8 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Применяет маску ввода телефона: 8 (XXX) XXX-XX-XX
 * Используется в onChange инпута
 */
export function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) return "";
  if (digits.length <= 1) return "8";

  let result = "8 (";
  const rest = digits.startsWith("8") ? digits.slice(1) : digits.startsWith("7") ? digits.slice(1) : digits;

  if (rest.length > 0) result += rest.slice(0, 3);
  if (rest.length >= 3) result += ") ";
  if (rest.length > 3) result += rest.slice(3, 6);
  if (rest.length >= 6) result += "-";
  if (rest.length > 6) result += rest.slice(6, 8);
  if (rest.length >= 8) result += "-";
  if (rest.length > 8) result += rest.slice(8, 10);

  return result;
}

/**
 * Валидирует номер телефона (должно быть 11 цифр, начинается с 8)
 */
export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length === 11 && digits.startsWith("8");
}
