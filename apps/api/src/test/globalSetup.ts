import { MongoMemoryServer } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/** One in-memory MongoDB for the whole run; each test file gets its own database. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const mongod = await MongoMemoryServer.create();
  project.provide("mongoUri", mongod.getUri());
  return async () => {
    await mongod.stop();
  };
}
