import pino from "pino";
import { env } from "./env";

/** Fields removed from every log line. Exported so a test can prove it. */
export const LOG_REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  // Client IP addresses identify people, so they stay out of the logs too.
  "req.remoteAddress",
  "req.remotePort",
  'req.headers["x-forwarded-for"]',
  'req.headers["x-real-ip"]',
  "*.password",
  "*.passwordHash",
  "*.phone",
  "*.email",
  "*.address",
];

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: LOG_REDACT_PATHS,
    remove: true,
  },
});
