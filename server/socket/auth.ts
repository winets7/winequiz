import { decode } from "next-auth/jwt";
import type { Socket } from "socket.io";

/**
 * Имена cookie, которые ставит Auth.js v5 для JWT-сессии.
 * В проде сайт под HTTPS — стоит cookie с префиксом `__Secure-`.
 * В деве — обычная (без префикса).
 *
 * Salt у `decode()` обязан совпадать с именем cookie (так Auth.js v5
 * солит ключ при шифровании JWE).
 */
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
] as const;

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export interface SocketUser {
  userId: string;
  name: string;
  role: string;
}

/**
 * Достаёт user из NextAuth JWT cookie рукопожатия Socket.io.
 * Возвращает null, если cookie нет или подпись невалидна.
 */
export async function verifySocketAuth(socket: Socket): Promise<SocketUser | null> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[socket-auth] AUTH_SECRET / NEXTAUTH_SECRET не задан");
    return null;
  }

  const cookies = parseCookies(socket.handshake.headers.cookie);

  for (const name of SESSION_COOKIE_NAMES) {
    const raw = cookies[name];
    if (!raw) continue;
    try {
      const decoded = await decode({
        token: raw,
        secret,
        salt: name,
      });
      const id = (decoded as { id?: unknown } | null)?.id;
      if (decoded && typeof id === "string" && id.length > 0) {
        return {
          userId: id,
          name:
            typeof (decoded as { name?: unknown }).name === "string"
              ? ((decoded as { name?: string }).name as string)
              : "",
          role:
            typeof (decoded as { role?: unknown }).role === "string"
              ? ((decoded as { role?: string }).role as string)
              : "PLAYER",
        };
      }
    } catch (err) {
      console.error(`[socket-auth] decode '${name}' failed:`, err);
    }
  }

  return null;
}
