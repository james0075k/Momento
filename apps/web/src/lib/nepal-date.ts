const OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/** "2026-10-12" (a Nepal day, from a date box) -> the last second of that day in Nepal, as an ISO string. */
export function endOfNepalDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1) - OFFSET_MS - 1000).toISOString();
}

/** An ISO time -> the Nepal calendar day it falls on ("2026-10-12"), for a date box. */
export function toNepalDay(iso: string): string {
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 10);
}
