"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHierarchicalParentHref } from "@/lib/hierarchical-parent-href";

export function PageNavMenu() {
  const pathname = usePathname() ?? "/";
  const parentHref = getHierarchicalParentHref(pathname);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const target = e.target as Node;
      if (!el.contains(target)) close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, close]);

  const showParent = parentHref != null && parentHref !== pathname;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {open && (
        <nav
          className="min-w-[13.5rem] rounded-2xl border border-[var(--border)] bg-[var(--card)] py-2 shadow-lg"
          aria-label="Быстрая навигация"
        >
          <ul className="flex flex-col gap-0.5 px-1">
            {showParent && (
              <li>
                <Link
                  href={parentHref}
                  onClick={close}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Родительская страница
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/profile"
                onClick={close}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Профиль
              </Link>
            </li>
            <li>
              <Link
                href="/"
                onClick={close}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Главный экран
              </Link>
            </li>
          </ul>
        </nav>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-md hover:bg-[var(--muted)] transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? "Закрыть меню навигации" : "Открыть меню навигации"}
        title="Меню"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {open ? (
            <>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </>
          ) : (
            <>
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
