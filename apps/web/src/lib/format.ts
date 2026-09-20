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
