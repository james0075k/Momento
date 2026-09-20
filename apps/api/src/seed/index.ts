import mongoose from "mongoose";
import { env } from "../config/env";
import { seedAdmin } from "./admin";
import { seedSample } from "./sample";

/**
 * Usage:
 *   seed              first admin + default settings + sample data
 *   seed --admin-only first admin only
 *   seed --allow-production   permit sample data when NODE_ENV=production
 */
async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const adminOnly = args.has("--admin-only");

  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!adminOnly && env.NODE_ENV === "production" && !args.has("--allow-production")) {
    throw new Error(
      "Refusing to load sample data in production. Use --admin-only, or pass --allow-production.",
    );
  }

  await mongoose.connect(env.MONGODB_URI);
  // Make sure unique indexes exist before inserting.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));

  const created = await seedAdmin({
    name: env.FIRST_ADMIN_NAME ?? "",
    email: env.FIRST_ADMIN_EMAIL ?? "",
    password: env.FIRST_ADMIN_PASSWORD ?? "",
  });
  console.log(
    created ? `Created admin ${env.FIRST_ADMIN_EMAIL}` : "Admin already exists, left unchanged",
  );

  if (!adminOnly) {
    const counts = await seedSample();
    console.log("Inserted sample data (existing records were kept):", counts);
  }
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
