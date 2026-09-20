import type { RequestHandler } from "express";
import { HttpError } from "./errorHandler";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie auth: state-changing requests must carry a custom header.
 * A cross-site form or simple request cannot set it, and CORS only lets allow-listed
 * origins send it, so a forged request from another site is rejected.
 */
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method) || req.get("x-requested-with") === "momento") {
    next();
    return;
  }
  next(new HttpError(403, "Missing X-Requested-With header"));
};
