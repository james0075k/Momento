/**
 * Small "list of product ids" helpers behind the wishlist and recently viewed. They live in the
 * browser (localStorage), so there are no accounts and nothing personal is sent anywhere.
 */
export const WISHLIST_STORAGE_KEY = "momento.wishlist.v1";
export const RECENT_STORAGE_KEY = "momento.recent.v1";
export const MAX_WISHLIST = 24;
export const MAX_RECENT = 8;

const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

/** Reads whatever was in localStorage and keeps only well-formed, unique ids. Never throws. */
export function parseIdList(raw: string | null, max: number): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return [...new Set(data.filter(isId))].slice(0, max);
  } catch {
    return [];
  }
}

/** Adds the id to the front, or removes it when it is already there. The oldest falls off at `max`. */
export function toggleId(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((entry) => entry !== id);
  return [id, ...list].slice(0, max);
}

/** Moves the id to the front (newest first), without duplicates, capped at `max`. */
export function pushRecent(list: string[], id: string, max: number): string[] {
  return [id, ...list.filter((entry) => entry !== id)].slice(0, max);
}
