import { ImageResponse } from "next/og";
import { brandTokens, IconImage } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS rounds the corners itself and fills transparent areas with black, so this one has a paper background. */
export default async function AppleIcon() {
  const color = await brandTokens();
  return new ImageResponse(
    <IconImage canvas={size.width} color={color} background={color.paper} fill={0.62} />,
    size,
  );
}
