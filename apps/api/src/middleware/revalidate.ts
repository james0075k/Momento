import type { RequestHandler } from "express";
import { revalidateWeb, type RevalidateTag } from "../services/revalidate";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * After a successful change to a resource the public site shows, asks the website to refresh what it
 * cached for it, so the change appears at once instead of within a minute. Runs after the response is
 * sent, and a failure there never affects the admin who made the change.
 */
export function revalidateOnWrite(tag: RevalidateTag): RequestHandler {
  return (req, res, next) => {
    if (MUTATING.has(req.method)) {
      res.on("finish", () => {
        if (res.statusCode < 400) void revalidateWeb(tag);
      });
    }
    next();
  };
}
