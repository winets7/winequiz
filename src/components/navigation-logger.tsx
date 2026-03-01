"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logNavigation } from "@/lib/navigation-log";

/**
 * Логирует все переходы между страницами (смена pathname).
 * Подключён в корневом layout — один раз на приложение.
 */
export function NavigationLogger() {
  const pathname = usePathname();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const current = pathname ?? "";
    const from = prevRef.current;
    if (from !== null && from !== current) {
      logNavigation({ type: "navigate", from, to: current });
    }
    prevRef.current = current;
  }, [pathname]);

  return null;
}
