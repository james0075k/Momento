import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "*.password",
      "*.passwordHash",
      "*.phone",
      "*.email",
      "*.address",
    ],
    remove: true,
  },
});
