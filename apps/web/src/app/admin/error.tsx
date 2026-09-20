"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * A screen in the admin panel failed to draw. The rest of the panel (menu, sign-out) keeps working, and
 * the message is written for staff, not for shoppers.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <div role="alert" className="bg-surface mx-auto max-w-lg rounded-2xl p-6 text-center">
      <h1 className="text-2xl font-semibold">This screen had a problem</h1>
      <p className="text-muted-foreground mt-2">
        Nothing you saved was lost. Try again, or go back to the dashboard.
        {error.digest && ` If it keeps happening, tell the developer this code: ${error.digest}.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-5 font-medium focus-visible:outline-2"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="border-input bg-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-5 font-medium focus-visible:outline-2"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
