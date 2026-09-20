import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, inject } from "vitest";
import "../models";

beforeAll(async () => {
  await mongoose.connect(inject("mongoUri"), { dbName: `test_${randomUUID().slice(0, 8)}` });
  // Build unique/text/TTL indexes up front so tests exercise them.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
});
