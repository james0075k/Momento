import {
  DEFAULT_SETTINGS,
  isFeatureOn,
  type FeatureKey,
  type Category,
  type Product,
  type Review,
  type Service,
  type Settings,
} from "@momento/shared";
import { apiGet, type ListEnvelope } from "./api";
import { shopApiPath, type ShopQuery } from "./shop-query";

/** Settings for the header, checkout and payment instructions. Falls back to defaults offline. */
export async function getSettings(): Promise<Settings> {
  const res = await apiGet<{ data: Settings }>("/settings", ["settings"]);
  return (
    res?.data ?? {
      ...DEFAULT_SETTINGS,
      shopWhatsappNumber:
        process.env.NEXT_PUBLIC_SHOP_WHATSAPP_NUMBER || DEFAULT_SETTINGS.shopWhatsappNumber,
    }
  );
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiGet<ListEnvelope<Category>>("/categories?limit=100");
  return (res?.data ?? [])
    .filter((category) => category.isActive)
    .sort((a, b) => a.order - b.order);
}

export interface ShopResult {
  products: Product[];
  total: number;
  totalPages: number;
  /** false when the API could not be reached, so the page can say so instead of "nothing found". */
  ok: boolean;
}

export async function getShopProducts(query: ShopQuery): Promise<ShopResult> {
  const res = await apiGet<ListEnvelope<Product>>(shopApiPath(query));
  return {
    products: res?.data ?? [],
    total: res?.meta.total ?? 0,
    totalPages: res?.meta.totalPages ?? 1,
    ok: res !== null,
  };
}

export async function getProduct(slug: string): Promise<Product | null> {
  const res = await apiGet<{ data: Product }>(`/products/${encodeURIComponent(slug)}`);
  return res?.data ?? null;
}

export interface ReviewSummary {
  count: number;
  average: number;
  /** Index 0 is 1 star, index 4 is 5 stars. */
  distribution: [number, number, number, number, number];
}

export function summarizeReviews(reviews: Review[], total: number): ReviewSummary | null {
  if (reviews.length === 0) return null;
  const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  for (const review of reviews)
    distribution[review.rating - 1] = (distribution[review.rating - 1] ?? 0) + 1;
  return {
    count: total,
    average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length,
    distribution,
  };
}

export async function getProductReviews(productId: string): Promise<{
  reviews: Review[];
  summary: ReviewSummary | null;
}> {
  const res = await apiGet<ListEnvelope<Review>>(`/reviews?productId=${productId}&limit=50`);
  const reviews = res?.data ?? [];
  return { reviews, summary: summarizeReviews(reviews, res?.meta.total ?? reviews.length) };
}

/** Same category first, topped up with anything else, never the product itself. */
export async function getRelatedProducts(product: Product, take = 4): Promise<Product[]> {
  const same = await apiGet<ListEnvelope<Product>>(
    `/products?category=${product.categoryId}&limit=${take + 1}`,
  );
  const picked = (same?.data ?? []).filter((candidate) => candidate.id !== product.id);
  if (picked.length >= take) return picked.slice(0, take);
  const more = await apiGet<ListEnvelope<Product>>(`/products?limit=${take + 3}`);
  for (const candidate of more?.data ?? []) {
    if (candidate.id !== product.id && !picked.some((p) => p.id === candidate.id)) {
      picked.push(candidate);
    }
  }
  return picked.slice(0, take);
}

/** Every active product, following the API's pages. Used by the sitemap and llms.txt. */
export async function getAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await apiGet<ListEnvelope<Product>>(`/products?limit=100&page=${page}`);
    if (!res) break;
    all.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return all;
}

export async function getServices(): Promise<Service[]> {
  const res = await apiGet<ListEnvelope<Service>>("/services?limit=100");
  return (res?.data ?? []).sort((a, b) => a.order - b.order);
}

export async function getService(slug: string): Promise<Service | null> {
  const res = await apiGet<{ data: Service }>(`/services/${encodeURIComponent(slug)}`);
  return res?.data ?? null;
}

/** True when a Phase 8 flag is on. Offline (no API) every flag is off, so the plain site still renders. */
export async function featureEnabled(key: FeatureKey): Promise<boolean> {
  return isFeatureOn(await getSettings(), key);
}

/** "Customers also bought" (flag `alsoBought`). Empty when the flag is off, the API is down, or there is not enough data. */
export async function getAlsoBought(productId: string): Promise<Product[]> {
  const res = await apiGet<{ data: Product[] }>(`/products/${productId}/also-bought`);
  return res?.data ?? [];
}
