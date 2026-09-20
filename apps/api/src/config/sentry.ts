import * as Sentry from "@sentry/node";
import { env } from "./env";

/**
 * Error monitoring. Does nothing unless SENTRY_DSN is set, so dev and tests never send anything.
 * Personal data is kept out on purpose: no default PII, and request bodies, cookies, headers,
 * query strings and user details are stripped before an event leaves the server.
 */
export function initSentry(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      delete event.user;
      return event;
    },
  });
}

/** Reports an unexpected (5xx) error. Safe to call when Sentry is off. */
export function reportError(err: unknown): void {
  if (env.SENTRY_DSN) Sentry.captureException(err);
}
