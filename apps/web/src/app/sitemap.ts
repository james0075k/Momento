import type { MetadataRoute } from "next";
import { OCCASIONS } from "@/config/occasions";
import { BLOG_POSTS } from "@/content/blog";
import { getAllProducts, getServices, getSettings } from "@/lib/catalog";
import { isFeatureOn } from "@momento/shared";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

/** Every public, indexable page. Active products and services come from the database. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, services, settings] = await Promise.all([
    getAllProducts(),
    getServices(),
    getSettings(),
  ]);
  const at = (value?: string) => (value ? new Date(value) : undefined);

  const fixed: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/services"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/occasions"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/how-it-works"), changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.6 },
  ];

  // Only pages that exist right now: the gift card page is 404 while its flag is off.
  if (isFeatureOn(settings, "giftCards")) {
    fixed.push({ url: absoluteUrl("/gift-cards"), changeFrequency: "yearly", priority: 0.4 });
  }

  return [
    ...fixed,
    ...products.map((product) => ({
      url: absoluteUrl(`/shop/${product.slug}`),
      lastModified: at(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...services.map((service) => ({
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: at(service.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...OCCASIONS.map((occasion) => ({
      url: absoluteUrl(`/occasions/${occasion.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: at(post.modified ?? post.published),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
