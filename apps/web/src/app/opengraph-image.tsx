import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** ImageResponse cannot read CSS variables, so the brand colours are read from tokens.css itself. */
async function brandTokens(): Promise<Record<string, string>> {
  const css = await readFile(path.join(process.cwd(), "src/styles/tokens.css"), "utf8");
  return Object.fromEntries(
    [...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

export default async function OpengraphImage() {
  const color = await brandTokens();
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
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{ width: 56, height: 56, background: color.brand, transform: "rotate(-6deg)" }}
        />
        <div style={{ fontSize: 88, fontWeight: 700 }}>{SITE_NAME}</div>
      </div>
      <div style={{ marginTop: 40, fontSize: 52, lineHeight: 1.2, maxWidth: 900 }}>
        {SITE_TAGLINE}
      </div>
      <div style={{ marginTop: 40, fontSize: 32, color: color.accent }}>
        Order on WhatsApp · Prices in NPR
      </div>
    </div>,
    size,
  );
}
