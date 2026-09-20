import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactElement } from "react";

/** ImageResponse cannot read CSS variables, so the brand colours are read from tokens.css itself. */
export async function brandTokens(): Promise<Record<string, string>> {
  const css = await readFile(path.join(process.cwd(), "src/styles/tokens.css"), "utf8");
  return Object.fromEntries(
    [...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

/** Fraunces 600 (SIL Open Font License), the same face as the site's headings and the header logo. */
export async function wordmarkFont(): Promise<{
  name: string;
  data: Buffer;
  weight: 600;
  style: "normal";
}> {
  const data = await readFile(path.join(process.cwd(), "src/assets/fonts/fraunces-latin-600.woff"));
  return { name: "Fraunces", data, weight: 600, style: "normal" };
}

/**
 * The Momento mark at `size` px, the same shape as components/brand/brand-mark.tsx: a square tilted
 * -6 degrees, with a paper rectangle inset 15% from the sides and top, half as tall as the square.
 */
export function MarkImage({
  size,
  color,
}: {
  size: number;
  color: Record<string, string>;
}): ReactElement {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: size,
        height: size,
        background: color.brand,
        transform: "rotate(-6deg)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: size * 0.15,
          top: size * 0.15,
          width: size * 0.7,
          height: size * 0.5,
          background: color.paper,
        }}
      />
    </div>
  );
}

/** A square canvas with the mark centred. The tilted square is ~1.1x its side wide, so `fill` is kept under 1. */
export function IconImage({
  canvas,
  color,
  background = "transparent",
  fill = 0.72,
}: {
  canvas: number;
  color: Record<string, string>;
  /** Omit for a transparent tab icon. */
  background?: string;
  fill?: number;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
      }}
    >
      <MarkImage size={Math.round(canvas * fill)} color={color} />
    </div>
  );
}
