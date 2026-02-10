import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Роуты, требующие авторизации
const protectedRoutes = ["/lobby", "/join", "/profile"];

// Роуты только для неавторизованных (если залогинен — редирект на главную)
const authRoutes = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Защищённые роуты — требуют авторизации
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Страницы авторизации — если уже залогинен, редирект на главную
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Все роуты кроме статики, _next, api
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api).*)",
  ],
};
