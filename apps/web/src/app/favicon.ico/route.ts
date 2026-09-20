import { ImageResponse } from "next/og";
import React from "react";
import { brandTokens, IconImage } from "@/lib/brand-image";

export const dynamic = "force-static";

const PX = 48;

/**
 * Some browsers and crawlers still ask for /favicon.ico first. An ICO file can hold a PNG, so this wraps
 * the same 48 px mark in the 22-byte ICO header instead of shipping a separate binary.
 */
export async function GET() {
  const color = await brandTokens();
  const png = Buffer.from(
    await new ImageResponse(React.createElement(IconImage, { canvas: PX, color }), {
      width: PX,
      height: PX,
    }).arrayBuffer(),
  );
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(PX, 6); // width
  header.writeUInt8(PX, 7); // height
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image size
  header.writeUInt32LE(22, 18); // image offset
  return new Response(Buffer.concat([header, png]), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
