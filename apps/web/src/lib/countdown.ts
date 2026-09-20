/** "3 days 4 hours", "4 hours 12 minutes", "12 minutes". Rounds down, and never shows seconds. */
export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "";
  const minutes = Math.floor(msLeft / 60_000);
  if (minutes < 1) return "under a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (days > 0)
    return hours > 0 ? `${unit(days, "day")} ${unit(hours, "hour")}` : unit(days, "day");
  if (hours > 0)
    return mins > 0 ? `${unit(hours, "hour")} ${unit(mins, "minute")}` : unit(hours, "hour");
  return unit(mins, "minute");
}
