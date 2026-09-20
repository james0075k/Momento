import { env } from "../config/env";
import { logger } from "../config/logger";

/**
 * Asks the web app to drop a cached data tag ("settings"), so a change made here shows immediately
 * instead of after the 60 second cache. Optional and best effort: without WEB_REVALIDATE_URL and
 * REVALIDATE_SECRET it does nothing, and a failure only means the site catches up within a minute.
 */
export type RevalidateTag =
  "settings" | "products" | "services" | "categories" | "home-sections" | "reviews";

export async function revalidateWeb(tag: RevalidateTag): Promise<void> {
  if (!env.WEB_REVALIDATE_URL || !env.REVALIDATE_SECRET) return;
  try {
    const res = await fetch(env.WEB_REVALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
      body: JSON.stringify({ tag }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) logger.warn({ status: res.status }, "Web revalidation was refused");
  } catch (err) {
    logger.warn({ err }, "Could not reach the web app to revalidate");
  }
}
