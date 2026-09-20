import type { MetadataRoute } from "next";
import { brandTokens } from "@/lib/brand-image";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const color = await brandTokens();
  return {
    name: `${SITE_NAME}: ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    start_url: "/",
    display: "standalone",
    background_color: color.paper,
    theme_color: color.brand,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
