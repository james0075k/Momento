import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    globalSetup: ["./src/test/globalSetup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // The first run downloads a mongod binary for mongodb-memory-server.
    hookTimeout: 300_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      JWT_ACCESS_SECRET: "test-access-secret-test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret-test-refresh-secret",
      CLOUDINARY_CLOUD_NAME: "demo-cloud",
      CLOUDINARY_API_KEY: "123456789",
      CLOUDINARY_API_SECRET: "cloudinary-test-secret",
    },
  },
});
