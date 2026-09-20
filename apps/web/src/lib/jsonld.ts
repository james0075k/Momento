import type { Product, Review, Service, Settings } from "@momento/shared";
import { plainText } from "./format";
import { absoluteUrl, BUSINESS, SITE_NAME, SITE_URL } from "./site";

export type JsonLdObject = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const isoDay = (value: string) => (value ? value.slice(0, 10) : undefined);
const digits = (value: string) => value.replace(/[^0-9]/g, "");
/** Plain text for structured data: tags become spaces, so close up the gaps they leave before punctuation. */
const clean = (html: string, max = 5000) => plainText(html, max).replace(/\s+([.,;:!?])/g, "$1");

/** The Organization every other entity points at, kept inline so each page stands alone. */
const orgRef = (): JsonLdObject => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
});

export function organizationLd(settings: Settings): JsonLdObject {
  const sameAs = Object.values(settings.socialLinks).filter(Boolean);
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/icon.svg"),
    description:
      "Momento prints photo books, framed prints, magnets and canvases in Nepal and delivers them across the country.",
    ...(sameAs.length > 0 ? { sameAs } : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: `+${digits(settings.shopWhatsappNumber)}`,
        ...(BUSINESS.email ? { email: BUSINESS.email } : {}),
        areaServed: "NP",
        availableLanguage: ["English", "Nepali"],
      },
    ],
  };
}

export function websiteLd(): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export function localBusinessLd(settings: Settings): JsonLdObject {
  const sameAs = Object.values(settings.socialLinks).filter(Boolean);
  return {
    "@type": ["LocalBusiness", "Store"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl("/opengraph-image"),
    description: "Photo books, framed prints, magnets and canvases printed in Nepal.",
    telephone: `+${digits(settings.shopWhatsappNumber)}`,
    ...(BUSINESS.email ? { email: BUSINESS.email } : {}),
    priceRange: "$$",
    currenciesAccepted: "NPR",
    paymentAccepted: "eSewa, Khalti, Bank transfer",
    address: {
      "@type": "PostalAddress",
      ...(BUSINESS.street ? { streetAddress: BUSINESS.street } : {}),
      addressLocality: BUSINESS.city,
      addressCountry: "NP",
    },
    areaServed: { "@type": "Country", name: "Nepal" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: BUSINESS.opens,
        closes: BUSINESS.closes,
      },
    ],
    ...(sameAs.length > 0 ? { sameAs } : {}),
    parentOrganization: { "@id": ORG_ID },
  };
}

export interface RatingSummary {
  average: number;
  count: number;
}

export interface ProductLdInput {
  product: Product;
  categoryName?: string;
  rating: RatingSummary | null;
  reviews: Review[];
}

export function productLd({
  product,
  categoryName,
  rating,
  reviews,
}: ProductLdInput): JsonLdObject {
  const url = absoluteUrl(`/shop/${product.slug}`);
  const description = clean(product.shortDescription || product.description, 500);
  const offerBase = {
    priceCurrency: "NPR",
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url,
    seller: orgRef(),
  };
  const prices = product.variants.map((variant) => variant.price);
  const offers: JsonLdObject =
    product.variants.length > 1
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "NPR",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: product.variants.length,
          offers: product.variants.map((variant) => ({
            "@type": "Offer",
            name: [variant.size, variant.cover, variant.pages ? `${variant.pages} pages` : ""]
              .filter(Boolean)
              .join(", "),
            price: variant.price,
            ...offerBase,
          })),
        }
      : {
          "@type": "Offer",
          price: prices[0] ?? product.basePrice,
          ...offerBase,
        };

  const reviewNodes = reviews.slice(0, 10).map((review) => ({
    "@type": "Review",
    author: { "@type": "Person", name: review.name },
    datePublished: isoDay(review.createdAt),
    ...(review.title ? { name: review.title } : {}),
    reviewBody: review.comment,
    reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
  }));

  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    ...(description ? { description } : {}),
    url,
    sku: product.slug,
    ...(product.images.length > 0 ? { image: product.images } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers,
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(rating.average * 10) / 10,
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(reviewNodes.length > 0 ? { review: reviewNodes } : {}),
  };
}

export function serviceLd(service: Service): JsonLdObject {
  const url = absoluteUrl(`/services/${service.slug}`);
  const description = clean(service.description, 500);
  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.title,
    ...(description ? { description } : {}),
    url,
    ...(service.image ? { image: service.image } : {}),
    serviceType: service.title,
    provider: orgRef(),
    areaServed: { "@type": "Country", name: "Nepal" },
    ...(service.startingPrice !== undefined
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "NPR",
            price: service.startingPrice,
            url,
            availability: "https://schema.org/InStock",
            seller: orgRef(),
          },
        }
      : {}),
  };
}

export interface Crumb {
  name: string;
  /** Site path. The last crumb may leave it out; it is the current page. */
  path: string;
}

export function breadcrumbLd(crumbs: Crumb[]): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqLd(faqs: FaqItem[]): JsonLdObject {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: clean(faq.answer) },
    })),
  };
}

export interface HowToStepInput {
  title: string;
  text: string;
}

export function howToLd(input: {
  name: string;
  description: string;
  path: string;
  /** ISO 8601 duration, e.g. "P3D". */
  totalTime: string;
  steps: HowToStepInput[];
}): JsonLdObject {
  const url = absoluteUrl(input.path);
  return {
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    totalTime: input.totalTime,
    step: input.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
      url: `${url}#step-${index + 1}`,
    })),
  };
}

export function articleLd(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
  published: string;
  modified?: string;
}): JsonLdObject {
  const url = absoluteUrl(input.path);
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: input.title,
    description: input.description,
    image: [input.image ?? absoluteUrl("/opengraph-image")],
    datePublished: input.published,
    dateModified: input.modified ?? input.published,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { ...orgRef(), logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
  };
}

/** Serialises for a <script> tag. "<" is escaped so no field can close the tag early. */
export function serializeLd(nodes: JsonLdObject | JsonLdObject[]): string {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": list }).replace(
    /</g,
    "\\u003c",
  );
}
