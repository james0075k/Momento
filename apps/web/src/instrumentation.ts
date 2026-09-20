/**
 * Sentry is only loaded when a DSN is set. Without one nothing is imported, which keeps development
 * builds fast and the production bundle small.
 */
export async function register() {
  // Written out in full so the bundler can see the value and leave Sentry out when it is empty.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

type RequestErrorArgs = Parameters<typeof import("@sentry/nextjs").captureRequestError>;

export async function onRequestError(...args: RequestErrorArgs) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
