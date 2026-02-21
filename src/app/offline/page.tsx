"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🍷</div>
        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: "var(--foreground)" }}
        >
          Нет подключения к интернету
        </h1>
        <p
          className="text-lg mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          Проверьте подключение к сети и попробуйте снова. Винная викторина
          ждёт вас!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--primary, #722F37)" }}
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
