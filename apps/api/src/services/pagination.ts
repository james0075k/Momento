import type { Paginated, PaginationMeta } from "@momento/shared";

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function paginated<T>(data: T[], page: number, limit: number, total: number): Paginated<T> {
  return { data, meta: paginationMeta(page, limit, total) };
}

export function skipFor(page: number, limit: number): number {
  return (page - 1) * limit;
}

/** Escape user text before putting it in a RegExp. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
