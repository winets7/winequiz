"use client";

import Link from "next/link";

export default function WineNosePlaceholderPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center space-y-8">
        <p className="text-xl md:text-2xl text-[var(--muted-foreground)]">
          Данное направление в разработке
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--border)] rounded-xl font-semibold hover:bg-[var(--muted)] transition-colors"
        >
          ← К выбору игр
        </Link>
      </div>
    </main>
  );
}
