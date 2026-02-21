import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      phone: string;
      role: string;
      level: number;
      xp: number;
      image?: string | null;
    };
  }

  interface User {
    phone?: string;
    role?: string;
    level?: number;
    xp?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phone: string;
    role: string;
    level: number;
    xp: number;
  }
}
