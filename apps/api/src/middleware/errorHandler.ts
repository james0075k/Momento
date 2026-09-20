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

/** Database trouble that is temporary: the shopper should be told to retry, not that the shop is broken. */
const DB_UNAVAILABLE_NAMES = new Set([
  "MongooseServerSelectionError",
  "MongoServerSelectionError",
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoNotConnectedError",
  "MongoPoolClearedError",
  "MongoTopologyClosedError",
  "DisconnectedError",
]);

function isDatabaseUnavailable(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const { name, message } = err as { name?: unknown; message?: unknown };
  return (
    (typeof name === "string" && DB_UNAVAILABLE_NAMES.has(name)) ||
    (typeof message === "string" && /buffering timed out/i.test(message))
  );
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // Part of the answer is already sent, so a JSON error can no longer be written: let Express close it.
  if (res.headersSent) {
    next(err);
    return;
  }
  // `req.log` carries the request id (also sent to the client as X-Request-Id), so a report can be traced.
  const log = req.log ?? logger;
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
  if (err instanceof mongoose.Error.ValidationError) {
    // A value the schema refuses (the request schemas normally catch these first). Only field names and
    // messages go back, in the same shape as a Zod failure.
    const fieldErrors = Object.fromEntries(
      Object.entries(err.errors).map(([field, problem]) => [field, [problem.message]]),
    );
    res.status(400).json({ error: "Validation failed", details: { fieldErrors } });
    return;
  }
  if (isDatabaseUnavailable(err)) {
    log.warn({ err }, "Database unavailable");
    res.setHeader("Retry-After", "5");
    res.status(503).json({ error: "The shop is busy right now. Please try again in a moment." });
    return;
  }
  // body-parser errors (malformed JSON, payload too large) carry a 4xx status.
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 413 ? "Payload too large" : "Bad request" });
    return;
  }

  log.error({ err }, "Unhandled error");
  reportError(err);
  res.status(500).json({ error: "Internal server error" });
}
