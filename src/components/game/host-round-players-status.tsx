"use client";

interface PlayerRow {
  userId: string;
  name: string;
  avatar: string | null;
  hasSubmitted: boolean;
}

interface HostRoundPlayersStatusProps {
  players: PlayerRow[];
  roundStatus: string;
}

function BlinkingWine() {
  return (
    <span
      className="inline-flex shrink-0 text-2xl animate-pulse select-none"
      title="Ответ ещё не отправлен"
      aria-label="Ожидание ответа"
    >
      🍷
    </span>
  );
}

function SubmittedIndicator() {
  return (
    <span
      className="inline-flex shrink-0 h-3 w-3 rounded-full bg-[var(--success)] shadow-sm ring-2 ring-[var(--success)] ring-opacity-30"
      title="Ответ отправлен"
      aria-label="Ответ отправлен"
    />
  );
}

export function HostRoundPlayersStatus({
  players,
  roundStatus,
}: HostRoundPlayersStatusProps) {
  const statusHint =
    roundStatus === "CREATED"
      ? "Раунд ещё не начат. После старта здесь будет видно, кто уже отправил ответ."
      : "Раунд идёт. Мигающий бокал — игрок ещё не отправил ответ, зелёный индикатор — ответ получен.";

  return (
    <div className="bg-[var(--card)] rounded-3xl shadow-lg border border-[var(--border)] p-6">
      <h3 className="text-lg font-bold mb-1">Участники</h3>
      <p className="text-sm text-[var(--muted-foreground)] mb-4">{statusHint}</p>
      {players.length === 0 ? (
        <p className="text-center text-[var(--muted-foreground)] py-6">
          В комнате пока нет игроков (кроме организатора).
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.userId}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3"
            >
              <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-[var(--background)] overflow-hidden border border-[var(--border)]">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg text-[var(--muted-foreground)]">
                    {(p.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="flex-1 min-w-0 font-medium truncate">{p.name}</span>
              <div className="shrink-0 flex items-center justify-center w-8">
                {p.hasSubmitted ? <SubmittedIndicator /> : <BlinkingWine />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
