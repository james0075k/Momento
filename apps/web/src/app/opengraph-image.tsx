import { ImageResponse } from "next/og";
import { brandTokens, MarkImage, wordmarkFont } from "@/lib/brand-image";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [color, font] = await Promise.all([brandTokens(), wordmarkFont()]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: color.ink,
        color: color.paper,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <MarkImage size={96} color={color} />
        <div style={{ fontFamily: "Fraunces", fontSize: 112, fontWeight: 600 }}>{SITE_NAME}</div>
      </div>
      <div style={{ marginTop: 48, fontSize: 52, lineHeight: 1.2, maxWidth: 900 }}>
        {SITE_TAGLINE}
      </div>
      <div style={{ marginTop: 40, fontSize: 32, color: color.accent }}>
        Order on WhatsApp · Prices in NPR
      </div>
    </div>,
    { ...size, fonts: [font] },
  );
}
