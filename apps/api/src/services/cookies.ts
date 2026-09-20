import type { CookieOptions, Response } from "express";
import { env } from "../config/env";

export const ACCESS_COOKIE = "momento_at";
export const REFRESH_COOKIE = "momento_rt";

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Production cookies are Secure and SameSite=None (web and API may be on different sites); dev uses Lax over http. */
export function baseCookieOptions(isProd: boolean, domain?: string): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    // CSRF is covered by the custom-header check plus the CORS allow-list.
    sameSite: isProd ? "none" : "lax",
    domain,
  };
}

const baseOptions = (): CookieOptions =>
  baseCookieOptions(env.NODE_ENV === "production", env.COOKIE_DOMAIN);

export function setAuthCookies(res: Response, access: string, refresh: string): void {
  res.cookie(ACCESS_COOKIE, access, {
    ...baseOptions(),
    path: "/",
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
  // The refresh cookie is only sent to the auth routes.
  res.cookie(REFRESH_COOKIE, refresh, {
    ...baseOptions(),
    path: "/auth",
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: "/auth" });
}
