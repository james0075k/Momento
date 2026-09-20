export const SITE_NAME = "Momento";
export const SITE_TAGLINE = "Photo books, frames and prints made in Nepal";
export const DEFAULT_DESCRIPTION =
  "Turn your memories into keepsakes. Photo books, framed prints, magnets and canvases, printed in Nepal and delivered across the country. Order on WhatsApp.";

/** Public origin with no trailing slash. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

/** Turns a site path ("/shop") or an https URL into an absolute URL. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Shop details for LocalBusiness data. Only what is set in the environment is published. */
export const BUSINESS = {
  city: process.env.NEXT_PUBLIC_BUSINESS_CITY || "Kathmandu",
  street: process.env.NEXT_PUBLIC_BUSINESS_STREET || undefined,
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || undefined,
  opens: process.env.NEXT_PUBLIC_BUSINESS_OPENS || "10:00",
  closes: process.env.NEXT_PUBLIC_BUSINESS_CLOSES || "19:00",
} as const;

/** Delivery promises quoted in copy, structured data and llms.txt. Keep in one place. */
export const DELIVERY = {
  insideValley: "2 to 3 working days in Kathmandu Valley",
  outsideValley: "4 to 7 working days outside the valley",
} as const;
