/** Только относительный путь — защита от open redirect. */
export function sanitizeAuthCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}
