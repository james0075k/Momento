/**
 * `pnpm dev:local`: everything the shop needs to run on this computer, with no MongoDB account.
 *
 * It starts a local MongoDB whose data is kept in apps/api/.mongo-data (so products, orders and
 * settings survive a restart), adds the sample shop and the first admin the first time, and then
 * starts the API. Point MONGODB_URI at Atlas instead when you want the real database.
 *
 * Only for development: it refuses to run with NODE_ENV=production.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

if (process.env.NODE_ENV === "production") {
  console.error("dev:local is for development only.");
  process.exit(1);
}

const PORT = 27018;
const dbPath = path.resolve(process.cwd(), ".mongo-data");
mkdirSync(dbPath, { recursive: true });

console.log("Starting the local database (first run downloads MongoDB once)...");
const mongod = await MongoMemoryServer.create({
  instance: { port: PORT, dbPath, storageEngine: "wiredTiger" },
});

// The settings loader reads the environment once, when it is first imported, so set this first.
process.env["MONGODB_URI"] = mongod.getUri("momento");
process.env["FIRST_ADMIN_NAME"] ??= "Admin";
process.env["FIRST_ADMIN_EMAIL"] ??= "admin@momento.test";
process.env["FIRST_ADMIN_PASSWORD"] ??= "Admin-Pass-2026!";

const { env } = await import("../config/env");
await import("../models");
const { seedAdmin } = await import("../seed/admin");
const { seedSample } = await import("../seed/sample");

await mongoose.connect(env.MONGODB_URI!);
await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
const created = await seedAdmin({
  name: env.FIRST_ADMIN_NAME ?? "",
  email: env.FIRST_ADMIN_EMAIL ?? "",
  password: env.FIRST_ADMIN_PASSWORD ?? "",
});
await seedSample(); // keeps anything that is already there
await mongoose.disconnect();
console.log(
  created
    ? `Admin created: ${env.FIRST_ADMIN_EMAIL} (password from FIRST_ADMIN_PASSWORD)`
    : "Admin already exists",
);

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());

// Start the API in this same process.
await import("../server");
