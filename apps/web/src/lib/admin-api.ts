import { API_URL, ApiError, failureMessage, type ErrorBody } from "./api";

export type AdminMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface AdminListResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Paths that must never trigger a silent refresh (a 401 from them is the real answer). */
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];

let refreshing: Promise<boolean> | null = null;

/**
 * Asks the API for a new access cookie using the refresh cookie. Concurrent callers share one request:
 * the API rotates the refresh token on every use, so two at once would look like token theft.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "momento" },
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(path: string, method: AdminMethod, body?: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      "X-Requested-With": "momento",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * A request to the API as the signed-in admin: cookies included, the CSRF header sent, and one silent
 * refresh plus retry when the short-lived access cookie has expired. Throws ApiError with the server's
 * own message; a 401 that survives the refresh means the session is over.
 */
async function request(path: string, method: AdminMethod, body?: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await send(path, method, body);
    if (res.status === 401 && !NO_REFRESH.includes(path) && (await refreshSession())) {
      res = await send(path, method, body);
    }
  } catch {
    throw new ApiError("Could not reach the shop. Check your connection and try again.", 0);
  }
  if (res.ok) return res;
  const parsed = (await res.json().catch(() => ({}))) as ErrorBody;
  throw new ApiError(failureMessage(res, parsed), res.status, parsed.details?.fieldErrors);
}

/** One record (the API wraps it in `{ data }`), or undefined for a 204. */
export async function adminRequest<T>(
  path: string,
  options: { method?: AdminMethod; body?: unknown } = {},
): Promise<T> {
  const res = await request(
    path,
    options.method ?? (options.body === undefined ? "GET" : "POST"),
    options.body,
  );
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as { data: T };
  return json.data;
}

/** A page of records with its pagination meta. */
export async function adminList<T>(path: string): Promise<AdminListResult<T>> {
  const res = await request(path, "GET");
  return (await res.json()) as AdminListResult<T>;
}

/** Turns a query object into `?a=1&b=2`, leaving out empty values. */
export function query(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
