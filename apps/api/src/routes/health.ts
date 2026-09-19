import { healthResponseSchema } from "@momento/shared";
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const body = healthResponseSchema.parse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  res.json(body);
});
