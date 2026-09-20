import {
  DEFAULT_SETTINGS,
  type Category,
  type HomeSection,
  type Product,
  type Review,
  type Service,
  type Settings,
} from "@momento/shared";
import type { SceneName } from "@/components/home/scenes";
import { apiGet, type ListEnvelope } from "./api";
import { plainText } from "./format";
import { toProductCard } from "./product-card";
import { SAMPLE_PRODUCTS, SAMPLE_REVIEWS, SAMPLE_SERVICES } from "./sample-content";

export interface ReviewStats {
  count: number;
  average: number;
}

/** What a product card needs, whether it came from the API or the preview content. */
export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  image?: string;
  category?: string;
  scene: SceneName;
  fromPrice: number;
  hasVariants: boolean;
}

export interface ServiceRowData {
  id: string;
  title: string;
  description: string;
  image?: string;
  startingPrice?: number;
}

export interface ReviewData {
  id: string;
  name: string;
  rating: number;
  title?: string;
  comment: string;
  photo?: string;
  verified: boolean;
}

export interface HomeData {
  sections: HomeSection[];
  products: ProductCardData[];
  services: ServiceRowData[];
  reviews: ReviewData[];
  reviewStats: ReviewStats | null;
  productTotal: number;
  settings: Settings;
}

/** Shown when the API is unreachable, so the page never renders empty. */
export const FALLBACK_SECTIONS: HomeSection[] = (
  [
    ["hero", "Turn your memories into keepsakes you can hold"],
    ["gallery", "Find a keepsake for the moment"],
    ["featured", "Made to be held, hung and gifted"],
    ["services", "More ways we can help"],
    ["reviews", "What customers say"],
    ["guarantees", "Our promise"],
  ] as const
).map(([type, title], order) => ({
  id: `fallback-${type}`,
  type,
  title,
  itemRefs: [],
  order,
  isVisible: true,
  createdAt: "",
  updatedAt: "",
}));

/** Puts items named in `refs` first, in that order; with refs, anything not named is left out. */
export function orderByRefs<T extends { id: string }>(items: T[], refs: string[]): T[] {
  if (refs.length === 0) return items;
  const rank = new Map(refs.map((id, index) => [id, index]));
  return items
    .filter((item) => rank.has(item.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/**
 * Named items first, in that order, then everything else in its own order. Used for services, whose
 * "show on the home page" switch already decides what appears: the section's list only sets the order,
 * so a service added later shows up without also editing the section.
 */
export function prioritizeByRefs<T extends { id: string }>(items: T[], refs: string[]): T[] {
  if (refs.length === 0) return items;
  const rank = new Map(refs.map((id, index) => [id, index]));
  const named = items
    .filter((item) => rank.has(item.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return [...named, ...items.filter((item) => !rank.has(item.id))];
}

const allowSampleContent = () =>
  process.env.NODE_ENV !== "production" || process.env.SAMPLE_CONTENT === "1";

export { toProductCard };

const toServiceRow = (service: Service): ServiceRowData => ({
  id: service.id,
  title: service.title,
  description: plainText(service.description),
  image: service.image,
  startingPrice: service.startingPrice,
});

const toReviewData = (review: Review): ReviewData => ({
  id: review.id,
  name: review.name,
  rating: review.rating,
  title: review.title,
  comment: review.comment,
  photo: review.photos[0],
  verified: review.verified,
});

export async function getHomeData(): Promise<HomeData> {
  // One probe first: if the API is down, skip the other calls instead of failing five more times.
  const sections = await apiGet<ListEnvelope<HomeSection>>("/home-sections");
  const [products, services, reviews, settings, allProducts, categories] = sections
    ? await Promise.all([
        apiGet<ListEnvelope<Product>>("/products?featured=true&limit=24"),
        apiGet<ListEnvelope<Service>>("/services?showOnHome=true&limit=24"),
        apiGet<ListEnvelope<Review>>("/reviews?limit=100"),
        apiGet<{ data: Settings }>("/settings", ["settings"]),
        apiGet<ListEnvelope<Product>>("/products?limit=1"),
        apiGet<ListEnvelope<Category>>("/categories?limit=100"),
      ])
    : [null, null, null, null, null, null];
  const categoryNames = new Map((categories?.data ?? []).map((c) => [c.id, c.name]));

  const sample = allowSampleContent();
  const productCards = products?.data.length
    ? products.data.map((product) => toProductCard(product, categoryNames))
    : sample
      ? SAMPLE_PRODUCTS
      : [];
  const serviceRows = services?.data.length
    ? [...services.data].sort((a, b) => a.order - b.order).map(toServiceRow)
    : sample
      ? SAMPLE_SERVICES
      : [];
  const reviewData = reviews?.data.length
    ? reviews.data.map(toReviewData)
    : sample
      ? SAMPLE_REVIEWS
      : [];

  const reviewStats =
    reviewData.length > 0
      ? {
          count: reviews?.data.length ? reviews.meta.total : reviewData.length,
          average: reviewData.reduce((sum, review) => sum + review.rating, 0) / reviewData.length,
        }
      : null;

  return {
    sections: sections?.data.length ? sections.data : FALLBACK_SECTIONS,
    products: productCards,
    services: serviceRows,
    reviews: reviewData,
    reviewStats,
    productTotal: allProducts?.meta.total ?? productCards.length,
    settings: settings?.data ?? {
      ...DEFAULT_SETTINGS,
      shopWhatsappNumber:
        process.env.NEXT_PUBLIC_SHOP_WHATSAPP_NUMBER || DEFAULT_SETTINGS.shopWhatsappNumber,
    },
  };
}
