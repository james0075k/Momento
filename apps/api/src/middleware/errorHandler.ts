import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof HttpError ? err.message : "Internal server error";

  if (statusCode >= 500) {
    logger.error({ err }, "Unhandled error");
  }

  res.status(statusCode).json({ error: message });
}
