import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Limits that keep one slow database from taking the whole API down with it: a bounded pool, and
 * timeouts so a request fails fast (and the shopper sees a message) instead of hanging.
 */
const CONNECT_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5_000,
  // Without this a query sent while the database is away waits 10 seconds before failing.
  bufferTimeoutMS: 5_000,
  socketTimeoutMS: 30_000,
  maxIdleTimeMS: 60_000,
} as const;

const RETRY_MS = 10_000;
let retryTimer: NodeJS.Timeout | undefined;

// Said once per change, so a database that comes and goes leaves a clear trail instead of silence.
mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));

async function attempt(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri, CONNECT_OPTIONS);
    logger.info("Connected to MongoDB");
  } catch (error) {
    // The first connection is not retried by the driver, so without this a database that is briefly
    // down at start-up would leave the API running but broken until someone restarted it.
    logger.error(
      { err: error },
      `Failed to connect to MongoDB, trying again in ${RETRY_MS / 1000}s`,
    );
    retryTimer = setTimeout(() => void attempt(uri), RETRY_MS);
    retryTimer.unref();
  }
}

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn("MONGODB_URI is not set; skipping database connection");
    return;
  }
  await attempt(env.MONGODB_URI);
}

export async function disconnectDatabase(): Promise<void> {
  if (retryTimer) clearTimeout(retryTimer);
  await mongoose.disconnect();
}
