import { DEFAULT_SETTINGS, type Product, type Review, type Service } from "@momento/shared";
import { describe, expect, it } from "vitest";
import { OCCASIONS } from "@/config/occasions";
import { BLOG_POSTS } from "@/content/blog";
import { ANSWER_MAX_WORDS, ANSWER_MIN_WORDS, countWords } from "./answers";
import {
  articleLd,
  breadcrumbLd,
  faqLd,
  howToLd,
  localBusinessLd,
  organizationLd,
  productLd,
  serializeLd,
  serviceLd,
} from "./jsonld";

const product: Product = {
  id: "a".repeat(24),
  title: "Wedding Album",
  slug: "wedding-album",
  categoryId: "b".repeat(24),
  shortDescription: "A heirloom album.",
  description: "<p>Lay-flat pages.</p>",
  images: ["https://res.cloudinary.com/demo/image/upload/a.jpg"],
  basePrice: 6500,
  variants: [
    { id: "c".repeat(24), size: "A4", cover: "Leatherette", price: 6500 },
    { id: "d".repeat(24), size: "A3", price: 9000 },
  ],
  highlights: [],
  occasions: ["wedding"],
  specs: [],
  faqs: [],
  isFeatured: false,
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const review: Review = {
  id: "e".repeat(24),
  productId: product.id,
  name: "Anita",
  rating: 5,
  title: "Lovely",
  comment: "Perfect album.",
  photos: [],
  status: "approved",
  verified: true,
  createdAt: "2026-09-03T10:00:00.000Z",
  updatedAt: "2026-09-03T10:00:00.000Z",
};

/** Properties Google's Rich Results Test requires or strongly recommends for each type. */
describe("structured data", () => {
  it("builds a Product with NPR offers, rating and reviews", () => {
    const ld = productLd({
      product,
      categoryName: "Photo books",
      rating: { average: 4.666, count: 3 },
      reviews: [review],
    });
    expect(ld["@type"]).toBe("Product");
    expect(ld["name"]).toBe("Wedding Album");
    expect(ld["image"]).toEqual(product.images);
    const offers = ld["offers"] as Record<string, unknown>;
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers["priceCurrency"]).toBe("NPR");
    expect(offers["lowPrice"]).toBe(6500);
    expect(offers["highPrice"]).toBe(9000);
    expect(offers["offerCount"]).toBe(2);
    expect(ld["aggregateRating"]).toMatchObject({
      ratingValue: 4.7,
      reviewCount: 3,
      bestRating: 5,
    });
    expect(ld["review"]).toHaveLength(1);
    expect((ld["review"] as Array<Record<string, unknown>>)[0]).toMatchObject({
      author: { name: "Anita" },
      datePublished: "2026-09-03",
      reviewRating: { ratingValue: 5 },
    });
  });

  it("uses a single Offer for a product without variants and omits empty rating data", () => {
    const ld = productLd({
      product: { ...product, variants: [], images: [] },
      rating: null,
      reviews: [],
    });
    expect(ld["offers"]).toMatchObject({ "@type": "Offer", price: 6500, priceCurrency: "NPR" });
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(ld).not.toHaveProperty("review");
    expect(ld).not.toHaveProperty("image");
  });

  it("builds Organization and LocalBusiness with a phone and Nepal address", () => {
    const settings = { ...DEFAULT_SETTINGS, socialLinks: { facebook: "https://facebook.com/m" } };
    expect(organizationLd(settings)).toMatchObject({
      "@type": "Organization",
      sameAs: ["https://facebook.com/m"],
    });
    expect(localBusinessLd(settings)).toMatchObject({
      telephone: "+9779800000000",
      address: { addressCountry: "NP" },
    });
  });

  it("builds a Service with an NPR offer only when there is a starting price", () => {
    const service: Service = {
      id: "f".repeat(24),
      title: "Photo restoration",
      slug: "photo-restoration",
      description: "<p>We repair old photos.</p>",
      showOnHome: false,
      order: 0,
      isActive: true,
      startingPrice: 500,
      createdAt: "",
      updatedAt: "",
    };
    expect(serviceLd(service)["offers"]).toMatchObject({ price: 500, priceCurrency: "NPR" });
    expect(serviceLd({ ...service, startingPrice: undefined })).not.toHaveProperty("offers");
  });

  it("numbers breadcrumb items from 1 with absolute URLs", () => {
    const ld = breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "Shop", path: "/shop" },
    ]);
    const items = ld["itemListElement"] as Array<Record<string, unknown>>;
    expect(items.map((item) => item["position"])).toEqual([1, 2]);
    expect(String(items[1]?.["item"])).toMatch(/^https?:\/\/.+\/shop$/);
  });

  it("strips HTML from FAQ answers", () => {
    const ld = faqLd([{ question: "Q?", answer: "<p>Yes, <b>always</b>.</p>" }]);
    const entity = (ld["mainEntity"] as Array<Record<string, unknown>>)[0];
    expect(entity?.["acceptedAnswer"]).toMatchObject({ text: "Yes, always." });
  });

  it("builds HowTo steps and Article dates", () => {
    const howTo = howToLd({
      name: "Order",
      description: "d",
      path: "/how-it-works",
      totalTime: "P3D",
      steps: [{ title: "One", text: "First" }],
    });
    expect((howTo["step"] as unknown[]).length).toBe(1);
    const article = articleLd({
      title: "T",
      description: "d",
      path: "/blog/t",
      published: "2026-09-01",
    });
    expect(article).toMatchObject({ datePublished: "2026-09-01", dateModified: "2026-09-01" });
  });

  it("escapes < so a field can never close the script tag", () => {
    const text = serializeLd({ "@type": "Thing", name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text)["@graph"][0].name).toBe("</script><script>alert(1)</script>");
  });
});

describe("page copy", () => {
  it("keeps every occasion answer between 40 and 60 words", () => {
    for (const occasion of OCCASIONS) {
      const words = countWords(occasion.answer);
      expect(words, occasion.slug).toBeGreaterThanOrEqual(ANSWER_MIN_WORDS);
      expect(words, occasion.slug).toBeLessThanOrEqual(ANSWER_MAX_WORDS);
    }
  });

  it("keeps every blog answer between 40 and 60 words and every internal link valid", () => {
    const paths = new Set([
      "/shop",
      "/services",
      "/how-it-works",
      ...OCCASIONS.map((occasion) => `/occasions/${occasion.slug}`),
    ]);
    for (const post of BLOG_POSTS) {
      const words = countWords(post.answer);
      expect(words, post.slug).toBeGreaterThanOrEqual(ANSWER_MIN_WORDS);
      expect(words, post.slug).toBeLessThanOrEqual(ANSWER_MAX_WORDS);
      const text = JSON.stringify(post.body);
      for (const [, href] of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        expect(paths.has((href ?? "").split("?")[0] ?? ""), `${post.slug} -> ${href}`).toBe(true);
      }
    }
  });

  it("only points occasions at blog posts that exist", () => {
    const slugs = new Set(BLOG_POSTS.map((post) => post.slug));
    for (const occasion of OCCASIONS) {
      for (const slug of occasion.posts) expect(slugs.has(slug), slug).toBe(true);
    }
  });
});
