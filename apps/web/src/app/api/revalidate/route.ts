import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const ALLOWED_TAGS = new Set([
  "settings",
  "products",
  "services",
  "categories",
  "home-sections",
  "reviews",
]);

/** Constant-time comparison, so response timing gives nothing away about the secret. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the API after settings change (a feature flag, say). Needs the shared REVALIDATE_SECRET.
 * Without it configured the route is closed, and the 60 second cache is all that applies.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret") ?? "";
  if (!expected || expected.length < 16 || !sameSecret(given, expected)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { tag?: unknown } | null;
  if (typeof body?.tag !== "string" || !ALLOWED_TAGS.has(body.tag)) {
    return NextResponse.json({ error: "Unknown tag" }, { status: 400 });
  }
  revalidateTag(body.tag);
  return NextResponse.json({ revalidated: body.tag });
}
