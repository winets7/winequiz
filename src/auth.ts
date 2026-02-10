import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Телефон и пароль",
      credentials: {
        phone: { label: "Телефон", type: "tel" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null;
        }

        const phone = normalizePhone(credentials.phone as string);
        const password = credentials.password as string;

        // Ищем пользователя по номеру телефона
        const user = await prisma.user.findUnique({
          where: { phone },
        });

        if (!user) {
          return null;
        }

        // Проверяем пароль (гостевые пользователи без пароля не могут войти)
        if (!user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          level: user.level,
          xp: user.xp,
          image: user.avatar,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      // При первом входе — записываем данные пользователя в токен
      if (user) {
        token.id = user.id as string;
        token.phone = user.phone as string;
        token.role = user.role as string;
        token.level = user.level as number;
        token.xp = user.xp as number;
      }
      return token;
    },

    async session({ session, token }) {
      // Передаём данные из токена в сессию
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.role = token.role as string;
        session.user.level = token.level as number;
        session.user.xp = token.xp as number;
      }
      return session;
    },
  },
});
