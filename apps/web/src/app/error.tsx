"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page fails to render. Reports the error, and gives the customer a way forward. */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Loaded only when Sentry is configured, so a page without it never downloads the library.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mt-3">
          Sorry, that page did not load. Try again, or order on WhatsApp and we will help.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-5 font-medium focus-visible:outline-2"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-ink/20 focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-5 font-medium focus-visible:outline-2"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
