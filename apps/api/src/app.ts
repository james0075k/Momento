import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { auditAdminActions } from "./middleware/audit";
import { requireCsrfHeader } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { buildRoutes } from "./routes";

export interface RateLimitOptions {
  /** Failed login attempts allowed per IP per 15 minutes. */
  login: number;
  /** Orders per IP per 15 minutes. */
  createOrder: number;
  /** Reviews per IP per 15 minutes. */
  createReview: number;
  /** Order tracking and coupon checks per IP per 15 minutes. */
  lookup: number;
  /** Customer photo-upload signatures per IP per 15 minutes. */
  upload: number;
}

const DEFAULT_LIMITS: RateLimitOptions = {
  login: 10,
  createOrder: 20,
  createReview: 10,
  lookup: 60,
  upload: 40,
};

function limiter(limit: number, skipSuccessfulRequests = false) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { error: "Too many requests, please try again later" },
  });
}

export function createApp(options: { rateLimits?: Partial<RateLimitOptions> } = {}): Express {
  const app = express();
  const limits = { ...DEFAULT_LIMITS, ...options.rateLimits };

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsAllowedOrigins.length > 0 ? env.corsAllowedOrigins : false,
      credentials: true,
      // The web app shows this id as a reference when something fails, so it must be readable across origins.
      exposedHeaders: ["X-Request-Id"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
    }),
  );

  app.use(limiter(env.RATE_LIMIT_GLOBAL));
  app.use(requireCsrfHeader);
  app.use(auditAdminActions);

  const limiters = {
    login: limiter(limits.login, true),
    createOrder: limiter(limits.createOrder),
    createReview: limiter(limits.createReview),
    lookup: limiter(limits.lookup),
    upload: limiter(limits.upload),
  };
  for (const [prefix, router] of buildRoutes(limiters)) {
    app.use(prefix, router);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
