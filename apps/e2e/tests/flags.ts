import { expect, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";
import { ADMIN, API_URL } from "../env";

export const CSRF = { "X-Requested-With": "momento" };

/** A request context signed in as the seeded admin. */
export async function adminContext(
  playwright: PlaywrightWorkerArgs["playwright"],
): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext();
  const res = await ctx.post(`${API_URL}/auth/login`, {
    headers: CSRF,
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(res.status()).toBe(200);
  return ctx;
}

/**
 * Sets feature flags through the same API the admin panel will use. Only the named flags change.
 * The API tells the web app to drop its cached settings, so the site reflects it straight away.
 */
export async function setFlags(
  admin: APIRequestContext,
  flags: Record<string, boolean>,
  extra: Record<string, unknown> = {},
) {
  const current = (await (await admin.get(`${API_URL}/settings`)).json()) as {
    data: Record<string, unknown>;
  };
  const { features: _ignored, createdAt: _c, updatedAt: _u, id: _i, ...settings } = current.data;
  const res = await admin.put(`${API_URL}/settings`, {
    headers: CSRF,
    data: { ...settings, features: flags, ...extra },
  });
  expect(res.status()).toBe(200);
}

export const ALL_OFF = {
  wishlist: false,
  recentlyViewed: false,
  alsoBought: false,
  share: false,
  festivalBanner: false,
  referrals: false,
  giftCards: false,
  orderAgain: false,
  nepali: false,
  bikramSambatDates: false,
  orderAlerts: false,
  dailySummary: false,
  photoEditor: false,
  csvExport: false,
};
