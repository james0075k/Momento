import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { bannerIsLive, isFeatureOn, resolveFeatures } from "@momento/shared";
import { Toaster } from "sonner";
import { FeaturesProvider } from "@/components/features/features-provider";
import { FestivalBanner } from "@/components/promotions/festival-banner";
import { brandTokens } from "@/lib/brand-image";
import { getSettings } from "@/lib/catalog";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  // "optional": the headline font is preloaded, and never swapping in late keeps the hero from shifting.
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  // Defaults for pages that set none (admin, sign-in): the logo card from opengraph-image.tsx is added by Next.
  openGraph: { siteName: SITE_NAME, locale: "en_NP", type: "website" },
  twitter: { card: "summary_large_image" },
  // Google Search Console token: set GOOGLE_SITE_VERIFICATION to the content of the meta tag it gives you.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};

export async function generateViewport(): Promise<Viewport> {
  // The browser toolbar takes the brand colour on phones. Read from tokens.css: a viewport cannot use CSS variables.
  const color = await brandTokens();
  return { width: "device-width", initialScale: 1, themeColor: color.brand };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Feature flags come from Settings (cached, tagged "settings"). If the API is down every flag reads as off.
  const settings = await getSettings();
  const features = resolveFeatures(settings.features);
  // Flag `festivalBanner`: shown only inside the banner dates. Off, or no banner set, and nothing changes.
  const banner =
    isFeatureOn(settings, "festivalBanner") && bannerIsLive(settings.banner)
      ? settings.banner
      : null;
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      style={banner ? ({ "--banner-h": "2.75rem" } as React.CSSProperties) : undefined}
    >
      <body>
        {banner && (
          <FestivalBanner
            text={banner.text}
            href={banner.href}
            couponCode={banner.couponCode}
            endsAt={banner.endsAt}
          />
        )}
        <FeaturesProvider features={features}>{children}</FeaturesProvider>
        <Toaster richColors />
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
