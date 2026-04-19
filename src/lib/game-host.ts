/**
 * Организатор (хост) не участвует в игре как игрок — исключаем его из списков участников.
 */
export function filterPlayersExcludingHost<
  T extends { userId?: string; user?: { id: string } },
>(players: T[], hostId: string): T[] {
  return players.filter((p) => {
    const uid = p.userId ?? p.user?.id;
    return uid !== hostId;
  });
}
