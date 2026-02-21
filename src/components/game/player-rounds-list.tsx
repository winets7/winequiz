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
}

export function PlayerRoundsList({
  rounds,
  totalRounds,
  gameId,
  gameStatus,
}: PlayerRoundsListProps) {
  const router = useRouter();

  // Получаем данные по номеру раунда
  const getRoundData = (roundNumber: number): RoundData | undefined => {
    return rounds.find((r) => r.roundNumber === roundNumber);
  };

  // Обработка клика по раунду
  const handleRoundClick = (roundNumber: number) => {
    const round = getRoundData(roundNumber);

    if (!round) {
      // Раунд не создан
      return;
    }

    if (round.status === "ACTIVE") {
      // Активный раунд - переходим на страницу игры
      router.push(`/play/${gameId}`);
    } else if (round.status === "CLOSED") {
      // Завершённый раунд - переходим на страницу истории с фильтром по раунду
      router.push(`/history/${gameId}?round=${roundNumber}`);
    } else if (round.status === "CREATED") {
      // Раунд создан, но ещё не начат
      // Можно показать уведомление или просто ничего не делать
      return;
    }
  };

  // Определяем статус раунда для отображения
  const getRoundStatus = (roundNumber: number) => {
    const round = getRoundData(roundNumber);

    if (!round) {
      return {
        icon: "⏳",
        label: "Ожидает начала",
        status: "pending",
        clickable: false,
      };
    }

    if (round.status === "CLOSED") {
      return {
        icon: "✅",
        label: "Завершён",
        status: "completed",
        clickable: true,
      };
    }

    if (round.status === "ACTIVE") {
      return {
        icon: "🟢",
        label: "Играется сейчас",
        status: "active",
        clickable: true,
      };
    }

    if (round.status === "CREATED") {
      return {
        icon: "📝",
        label: "Ожидает начала",
        status: "created",
        clickable: false,
      };
    }

    return {
      icon: "⏳",
      label: "Ожидает начала",
      status: "pending",
      clickable: false,
    };
  };

  const roundNumbers = Array.from({ length: totalRounds }, (_, i) => i + 1);

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

          return (
            <button
              key={num}
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
                {roundStatus.status === "pending" && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {roundStatus.label}
                  </p>
                )}
                {roundStatus.status === "created" && (
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
