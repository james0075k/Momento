import { OCCASIONS } from "@/config/occasions";

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Name: A to Z" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];

export interface ShopQuery {
  category?: string;
  occasion?: string;
  q?: string;
  sort: SortValue;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads the shop URL. Anything malformed is dropped, so the page never errors on a bad link. */
export function parseShopQuery(params: RawSearchParams): ShopQuery {
  const category = first(params.category);
  const occasion = first(params.occasion);
  const q = first(params.q)?.trim().slice(0, 100);
  const sort = first(params.sort);
  const page = Number(first(params.page));
  return {
    category: category && SLUG.test(category) ? category : undefined,
    occasion: OCCASIONS.some((item) => item.slug === occasion) ? occasion : undefined,
    q: q || undefined,
    sort: SORTS.some((item) => item.value === sort) ? (sort as SortValue) : "newest",
    page: Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1,
  };
}

/** The query string for the shop URL. Defaults are left out to keep links short. */
export function shopSearch(query: Partial<ShopQuery>): string {
  const search = new URLSearchParams();
  if (query.category) search.set("category", query.category);
  if (query.occasion) search.set("occasion", query.occasion);
  if (query.q) search.set("q", query.q);
  if (query.sort && query.sort !== "newest") search.set("sort", query.sort);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const SHOP_PAGE_SIZE = 12;

/** The API path for a shop query. */
export function shopApiPath(query: ShopQuery): string {
  const search = new URLSearchParams({
    limit: String(SHOP_PAGE_SIZE),
    page: String(query.page),
    sort: query.sort,
  });
  if (query.category) search.set("category", query.category);
  if (query.occasion) search.set("occasion", query.occasion);
  if (query.q) search.set("q", query.q);
  return `/products?${search.toString()}`;
}
