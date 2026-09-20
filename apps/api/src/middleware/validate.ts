import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "./errorHandler";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function replace(req: object, key: "body" | "query" | "params", value: unknown): void {
  // req.query is a getter in some Express versions; redefine it so parsed values win.
  Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true });
}

/** Validates and replaces body/query/params with the parsed (typed, defaulted) values. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        next(new HttpError(400, "Validation failed", result.error.flatten()));
        return;
      }
      replace(req, key, result.data);
    }
    next();
  };
}
