/**
 * Per-user, per-room "clear chat" cutoffs: messages at or before the cutoff
 * timestamp are hidden for that user only (stored locally; survives refresh).
 */

const storageKey = (matrixUserId: string) =>
  `chat-clear-cutoff:${matrixUserId}`;

export function getChatClearCutoff(
  matrixUserId: string | null | undefined,
  roomId: string,
): number | null {
  if (!matrixUserId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(matrixUserId));
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, number>;
    const v = map[roomId];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Hide all messages with origin_server_ts <= returned cutoff. */
export function setChatClearCutoff(
  matrixUserId: string | null | undefined,
  roomId: string,
  cutoffOriginServerTs: number,
): void {
  if (!matrixUserId || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(storageKey(matrixUserId));
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[roomId] = cutoffOriginServerTs;
    localStorage.setItem(storageKey(matrixUserId), JSON.stringify(map));
  } catch {
    /* ignore quota / parse */
  }
}

export function filterMessagesAfterClear<T extends { origin_server_ts: number }>(
  messages: T[],
  cutoff: number | null,
): T[] {
  if (cutoff == null) return messages;
  return messages.filter((m) => m.origin_server_ts > cutoff);
}
