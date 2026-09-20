"use client";

import NextError from "next/error";
import { useEffect } from "react";

/** Last resort when the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Loaded only when Sentry is configured, so a page without it never downloads the library.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={500} />
      </body>
    </html>
  );
}
