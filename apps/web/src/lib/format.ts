/** Whole rupees with Nepali/Indian digit grouping, e.g. "NPR 1,20,000". */
export function formatNpr(amount: number): string {
  return `NPR ${amount.toLocaleString("en-IN")}`;
}

/** Turns the API's rich-text HTML into a short plain-text teaser. React escapes the result. */
export function plainText(html: string, maxLength = 140): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/** "20 Sep 2026, 14:05", always in Nepal time whatever the browser's zone is. */
export function formatNepalDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kathmandu",
  });
}

/** "20 Sep 2026" in Nepal time. */
export function formatNepalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  });
}
