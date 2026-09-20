import type { RequestHandler } from "express";
import type { UserRole } from "@momento/shared";
import { ACCESS_COOKIE } from "../services/cookies";
import { verifyAccessToken } from "../services/tokens";
import { HttpError } from "./errorHandler";

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function readUser(cookie: unknown): AuthUser | undefined {
  if (typeof cookie !== "string") return undefined;
  try {
    return verifyAccessToken(cookie);
  } catch {
    return undefined;
  }
}

/** Requires a valid access-token cookie. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const user = readUser((req.cookies as Record<string, unknown> | undefined)?.[ACCESS_COOKIE]);
  if (!user) {
    next(new HttpError(401, "Authentication required"));
    return;
  }
  req.user = user;
  next();
};

/** Attaches req.user when a valid cookie is present, but never rejects. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const user = readUser((req.cookies as Record<string, unknown> | undefined)?.[ACCESS_COOKIE]);
  if (user) req.user = user;
  next();
};

/** Use after authenticate. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Forbidden"));
      return;
    }
    next();
  };
}

export const staffOrAdmin: RequestHandler[] = [authenticate, requireRole("admin", "staff")];
export const adminOnly: RequestHandler[] = [authenticate, requireRole("admin")];
