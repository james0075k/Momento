export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ListEnvelope<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** After the API cannot be reached, calls fail at once for this long instead of each waiting to fail. */
export const API_COOLDOWN_MS = 5000;
let downUntil = 0;

/** True for a few seconds after the API could not be reached (not after an ordinary 404 or 500). */
export function apiLooksDown(): boolean {
  return Date.now() < downUntil;
}

/** For tests. */
export function resetApiBreaker(): void {
  downUntil = 0;
}

const RESOURCE_TAGS = new Set([
  "products",
  "services",
  "categories",
  "home-sections",
  "reviews",
  "settings",
]);

/** The cache tag for an API path: /products?limit=3 -> "products". The API asks us to refresh these after admin changes. */
export function tagFor(path: string): string | undefined {
  const first = path.split("?")[0]?.split("/")[1];
  return first && RESOURCE_TAGS.has(first) ? first : undefined;
}

/**
 * GET from the Momento API with 60s ISR caching. Returns null on any failure so pages still render.
 * `tags` lets the API drop this entry early (see /api/revalidate), e.g. "settings" after a flag change.
 *
 * When the API cannot be reached at all (not running, or hanging), the next calls return null immediately
 * for a few seconds. A page makes many calls, so this turns "wait and fail, again and again" into one
 * failure, which keeps pages fast and the log short while the API is down.
 */
export async function apiGet<T>(path: string, tags?: string[]): Promise<T | null> {
  if (apiLooksDown()) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: {
        revalidate: 60,
        tags: [...new Set([...(tags ?? []), ...(tagFor(path) ? [tagFor(path)!] : [])])],
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    downUntil = Date.now() + API_COOLDOWN_MS;
    return null;
  }
}

/** An API failure with the server's own message, safe to show to the customer. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export interface ErrorBody {
  error?: string;
  details?: { fieldErrors?: Record<string, string[]> };
}

/**
 * What to tell the person when the API answered with an error. The server's own message is used for
 * problems they can fix (a wrong field, a full coupon) and for "busy, retry" (503). A server fault gets a
 * plain sentence plus the short reference the API sent, so a screenshot or a WhatsApp message to the shop
 * is enough to find it in the logs.
 */
export function failureMessage(res: Pick<Response, "status" | "headers">, body: ErrorBody): string {
  if (res.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (res.status >= 500 && res.status !== 503) {
    const ref = res.headers.get("X-Request-Id")?.slice(0, 8);
    return `Something went wrong on our side. Please try again in a moment.${ref ? ` (Reference ${ref})` : ""}`;
  }
  return body.error ?? "Something went wrong. Please try again.";
}

/**
 * Browser-side request. Never cached (prices and orders must be live) and always sends the
 * header the API requires on writes. Throws ApiError with the server's message on failure.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      cache: "no-store",
      headers: {
        "X-Requested-With": "momento",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Could not reach the shop. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(failureMessage(res, body), res.status, body.details?.fieldErrors);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}
