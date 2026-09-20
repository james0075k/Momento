import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env";

/**
 * For routes only a scheduler may call. The secret comes in the x-cron-secret header and is compared
 * in constant time. Anything wrong, or no CRON_SECRET configured, answers exactly like an unknown
 * route (404), so the route cannot be found by probing.
 */
export const requireCronSecret: RequestHandler = (req, res, next) => {
  const expected = env.CRON_SECRET;
  const given = req.get("x-cron-secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected ?? "");
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
};
