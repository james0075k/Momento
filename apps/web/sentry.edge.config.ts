import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

if (sentryOptions.dsn) Sentry.init(sentryOptions);
