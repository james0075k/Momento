import type { Metadata } from "next";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "./site";

interface PageSeo {
  /** Page title without the site name; the layout template adds " | Momento". */
  title: string;
  description?: string;
  /** Site path, used for the canonical URL and og:url. */
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  /** Use the title exactly as given, with no site name added. */
  absoluteTitle?: boolean;
}

/** Title, description, canonical, Open Graph and Twitter tags for one page. */
export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
  absoluteTitle = false,
}: PageSeo): Metadata {
  const url = absoluteUrl(path);
  const images = [{ url: image ?? "/opengraph-image", alt: title }];
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    // Kept out of results, but its links (to products, say) are still followed.
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_NP",
      type,
      images,
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
  };
}

/** Cart, checkout and order pages: useful to customers, useless in search results. */
export const noindexMetadata = (title: string): Metadata => ({
  title,
  robots: { index: false, follow: false },
});
