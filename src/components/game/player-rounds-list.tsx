"use client";

import { useRouter } from "next/navigation";

interface RoundData {
  id: string;
  roundNumber: number;
  status: string;
  color: string | null;
  country: string | null;
  vintageYear: number | null;
  grapeVarieties: string[];
}

interface PlayerRoundsListProps {
  rounds: RoundData[];
  totalRounds: number;
  gameId: string;
  gameStatus: string;
  /** Режим для хоста: показывать статус раунда и кнопки «Начать раунд» / «История ответов раунда» */
  variant?: "host" | "player";
  /** Все раунды заполнены — только тогда у хоста показывается кнопка «Начать раунд» у запланированных */
  allRoundsFilled?: boolean;
  /** Хост: запуск раунда (activate_round) */
  onStartRound?: (roundId: string, roundNumber: number) => void;
  /** Хост: завершить раунд (close_round) */
  onCloseRound?: (roundId: string) => void;
  /** Хост: открыть редактор раунда */
  onEditRound?: (roundNumber: number) => void;
}

export function PlayerRoundsList({
  rounds,
  totalRounds,
  gameId,
  gameStatus,
  variant = "player",
  allRoundsFilled = false,
  onStartRound,
  onCloseRound,
  onEditRound,
}: PlayerRoundsListProps) {
  const router = useRouter();

  const getRoundData = (roundNumber: number): RoundData | undefined => {
    return rounds.find((r) => r.roundNumber === roundNumber);
  };

  const isRoundFilled = (roundNumber: number): boolean => {
    const round = getRoundData(roundNumber);
    return !!round?.color;
  };

  const handleRoundClick = (roundNumber: number) => {
    const round = getRoundData(roundNumber);
    if (!round) return;

    if (round.status === "ACTIVE") {
      router.push(`/play/${gameId}`);
    } else if (round.status === "CLOSED") {
      router.push(`/history/${gameId}?round=${roundNumber}`);
    }
  };

  const getRoundStatus = (roundNumber: number) => {
    const round = getRoundData(roundNumber);

    if (!round) {
      return {
        icon: "⏳",
        label: "Ожидает начала",
        statusLabel: "—" as string,
        status: "pending" as const,
        clickable: false,
      };
    }

    if (round.status === "CLOSED") {
      return {
        icon: "✅",
        label: "Завершён",
        statusLabel: "Завершён",
        status: "completed" as const,
        clickable: true,
      };
    }

    if (round.status === "ACTIVE") {
      return {
        icon: "🟢",
        label: "Играется сейчас",
        statusLabel: "Идёт",
        status: "active" as const,
        clickable: true,
      };
    }

    if (round.status === "CREATED") {
      return {
        icon: "📝",
        label: "Ожидает начала",
        statusLabel: "Запланирован",
        status: "created" as const,
        clickable: false,
      };
    }

    return {
      icon: "⏳",
      label: "Ожидает начала",
      statusLabel: "—",
      status: "pending" as const,
      clickable: false,
    };
  };

  const roundNumbers = Array.from({ length: totalRounds }, (_, i) => i + 1);
  const isHost = variant === "host";

  return (
    <div className="bg-[var(--card)] rounded-2xl p-4 shadow border border-[var(--border)]">
      <h3 className="text-lg font-bold mb-3">
        🍷 Раунды ({rounds.filter((r) => r.status === "CLOSED").length}/{totalRounds} завершено)
      </h3>
      <div className="space-y-2">
        {roundNumbers.map((num) => {
          const roundStatus = getRoundStatus(num);
          const round = getRoundData(num);
          const isClickable = roundStatus.clickable;
          const filled = isRoundFilled(num);

          if (isHost) {
            return (
              <div
                key={num}
                className={`w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-colors ${
                  roundStatus.status === "active"
                    ? "bg-[var(--primary)] bg-opacity-10 border-[var(--primary)]"
                    : roundStatus.status === "completed"
                    ? "bg-[var(--success)] bg-opacity-10 border-[var(--success)]"
                    : filled
                    ? "bg-[var(--muted)] border-[var(--border)]"
                    : "bg-[var(--muted)] border-[var(--border)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onEditRound?.(num)}
                  className="flex flex-1 items-center gap-3 min-w-0 text-left sm:min-w-0"
                >
                  <span className="text-xl shrink-0" title={roundStatus.statusLabel}>
                    {roundStatus.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Раунд {num}</p>
                  </div>
                </button>
                <div
                  className="flex flex-wrap items-center gap-2 sm:shrink-0 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {round?.status === "CREATED" && allRoundsFilled && onStartRound && (
                    <button
                      type="button"
                      onClick={() => onStartRound(round.id, round.roundNumber)}
                      className="px-3 py-1.5 text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 whitespace-nowrap"
                    >
                      Начать раунд
                    </button>
                  )}
                  {round?.status === "ACTIVE" && onCloseRound && (
                    <button
                      type="button"
                      onClick={() => onCloseRound(round.id)}
                      className="px-3 py-1.5 text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 whitespace-nowrap"
                    >
                      Завершить раунд
                    </button>
                  )}
                  {(round?.status === "ACTIVE" || round?.status === "CLOSED") && (
                    <button
                      type="button"
                      onClick={() => router.push(`/history/${gameId}?round=${num}`)}
                      className="px-3 py-1.5 text-sm font-medium bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-lg hover:opacity-90 min-w-0 max-w-full"
                    >
                      <span className="sm:hidden">История ответов</span>
                      <span className="hidden sm:inline">История ответов раунда</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <button
              key={num}
              type="button"
              onClick={() => isClickable && handleRoundClick(num)}
              disabled={!isClickable}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                roundStatus.status === "active"
                  ? "bg-[var(--primary)] bg-opacity-10 border-2 border-[var(--primary)] hover:bg-opacity-20 cursor-pointer"
                  : roundStatus.status === "completed"
                  ? "bg-[var(--success)] bg-opacity-10 border border-[var(--success)] hover:bg-opacity-20 cursor-pointer text-white"
                  : roundStatus.status === "created"
                  ? "bg-[var(--muted)] border border-[var(--border)] opacity-60 cursor-not-allowed"
                  : "bg-[var(--muted)] hover:bg-[var(--border)] cursor-not-allowed"
              }`}
            >
              <span className="text-xl">{roundStatus.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Раунд {num}</p>
                {round && roundStatus.status === "active" && (
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {round.color === "RED"
                      ? "🔴"
                      : round.color === "WHITE"
                      ? "⚪"
                      : round.color === "ROSE"
                      ? "🩷"
                      : round.color === "ORANGE"
                      ? "🟠"
                      : ""}{" "}
                    {round.country || "?"} · {round.vintageYear || "?"} ·{" "}
                    {round.grapeVarieties?.join(", ") || "?"}
                  </p>
                )}
                {(roundStatus.status === "pending" || roundStatus.status === "created") && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {roundStatus.label}
                  </p>
                )}
              </div>
              {isClickable && roundStatus.status !== "completed" && (
                <span className="text-[var(--muted-foreground)]">→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
