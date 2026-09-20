import { isFeatureOn, type FeatureKey } from "@momento/shared";
import type { RequestHandler } from "express";
import { asyncHandler } from "./asyncHandler";
import { getSettings } from "../services/settings";

/**
 * Route guard for a Phase 8 feature. With the flag off the route answers exactly like an unknown
 * route (404), so a switched-off feature leaves nothing behind for anyone to find.
 */
export function requireFeature(key: FeatureKey): RequestHandler {
  return asyncHandler(async (_req, res, next) => {
    if (isFeatureOn(await getSettings(), key)) {
      next();
      return;
    }
    res.status(404).json({ error: "Not found" });
  });
}
