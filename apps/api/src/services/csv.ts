/** Excel opens a UTF-8 file correctly (Nepali names included) only when it starts with this mark. */
export const CSV_BOM = "﻿";

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_PHONE = /^\+?\d[\d\s-]*$/;

/**
 * One CSV cell, quoted per RFC 4180. Text that a spreadsheet would run as a formula (starts with
 * = + - @ or a control character) gets a leading apostrophe, which makes it plain text. Real numbers
 * and phone numbers are left alone.
 */
export function csvCell(value: unknown, options: { phone?: boolean } = {}): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text: string;
  if (typeof value === "string") text = value;
  else if (value instanceof Date) text = value.toISOString();
  else if (typeof value === "boolean") text = value ? "true" : "false";
  else return ""; // Objects have no sensible cell text; better empty than "[object Object]".
  const isPhone = options.phone === true && PLAIN_PHONE.test(text);
  if (FORMULA_START.test(text) && !isPhone) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A row of cells, ended with CRLF. Pass `{ phone: true }` in `phoneColumns` for columns holding phone numbers. */
export function csvRow(cells: unknown[], phoneColumns: number[] = []): string {
  return `${cells.map((cell, index) => csvCell(cell, { phone: phoneColumns.includes(index) })).join(",")}\r\n`;
}
