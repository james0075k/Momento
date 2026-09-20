import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { reportError } from "../config/sentry";

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

function isDuplicateKeyError(err: unknown): err is { code: number; keyPattern?: object } {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }
  if (isDuplicateKeyError(err)) {
    const fields = Object.keys(err.keyPattern ?? {});
    res.status(409).json({ error: "Already exists", details: { fields } });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // body-parser errors (malformed JSON, payload too large) carry a 4xx status.
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 413 ? "Payload too large" : "Bad request" });
    return;
  }

  logger.error({ err }, "Unhandled error");
  reportError(err);
  res.status(500).json({ error: "Internal server error" });
}
