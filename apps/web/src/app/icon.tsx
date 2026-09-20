import { ImageResponse } from "next/og";
import { brandTokens, IconImage } from "@/lib/brand-image";

/**
 * Tab, bookmark and home-screen icons, drawn from the same mark as the header logo. Multiples of 48 px
 * are what Google Search asks for; 192 and 512 are for the web app manifest and the structured-data logo.
 */
const SIZES = [32, 48, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((px) => ({
    id: String(px),
    size: { width: px, height: px },
    contentType: "image/png",
    alt: "Momento",
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> | string | number }) {
  const px = Number(await id);
  const color = await brandTokens();
  return new ImageResponse(<IconImage canvas={px} color={color} />, { width: px, height: px });
}
