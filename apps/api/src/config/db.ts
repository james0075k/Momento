import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn("MONGODB_URI is not set; skipping database connection");
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to MongoDB");
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
