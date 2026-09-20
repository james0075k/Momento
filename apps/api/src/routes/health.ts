import { healthResponseSchema } from "@momento/shared";
import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

/** Liveness: the process is up. Cheap, so load balancers can poll it often. */
healthRouter.get("/", (_req, res) => {
  const body = healthResponseSchema.parse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  res.json(body);
});

/** Readiness: also needs the database. Point uptime monitors here so a lost database pages someone. */
healthRouter.get("/ready", async (_req, res) => {
  const up = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
  let reachable = false;
  if (up) {
    try {
      await mongoose.connection.db?.admin().ping();
      reachable = true;
    } catch {
      reachable = false;
    }
  }
  res.status(reachable ? 200 : 503).json({
    status: reachable ? "ok" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});
