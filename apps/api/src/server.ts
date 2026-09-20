import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { initSentry, reportError } from "./config/sentry";

async function main(): Promise<void> {
  initSentry();
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });

  // PM2 and Docker stop the process with SIGTERM/SIGINT: finish in-flight requests, then close the database.
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info(`${signal} received, shutting down`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(() => {
      disconnectDatabase()
        .catch((err: unknown) => logger.error({ err }, "Error closing database"))
        .finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  reportError(reason);
});

// After an uncaught exception the process may be half-broken (open transactions, a request that never
// answers). Log it, tell Sentry, and exit so PM2 starts a clean process; the shutdown timer covers the flush.
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception, exiting");
  reportError(error);
  setTimeout(() => process.exit(1), 1_000).unref();
});

main().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start server");
  reportError(error);
  process.exit(1);
});
