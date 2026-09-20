import { sentryOptions } from "@/lib/sentry";

// Sentry (a sizeable script) is downloaded only when a DSN is configured, and after the page is usable.
if (sentryOptions.dsn) {
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.init({ ...sentryOptions, replaysSessionSampleRate: 0 }),
  );
}

export function onRouterTransitionStart(href: string, navigationType: string) {
  if (!sentryOptions.dsn) return;
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.captureRouterTransitionStart(href, navigationType as "push" | "replace" | "traverse"),
  );
}
