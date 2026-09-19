import { createApp } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function main(): Promise<void> {
  await connectDatabase();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});
