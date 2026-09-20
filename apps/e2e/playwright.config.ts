import { defineConfig, devices } from "@playwright/test";

import { ADMIN, API_URL, PORTS, REVALIDATE_SECRET, WEB_URL } from "./env";

const apiEnv = {
  NODE_ENV: "development",
  PORT: String(PORTS.api),
  MONGODB_URI: `mongodb://127.0.0.1:${PORTS.mongo}/momento_e2e`,
  // Test-only secrets for a throwaway database.
  JWT_ACCESS_SECRET: "e2e-access-secret-e2e-access-secret-0001",
  JWT_REFRESH_SECRET: "e2e-refresh-secret-e2e-refresh-secret-02",
  CORS_ALLOWED_ORIGINS: WEB_URL,
  FIRST_ADMIN_NAME: ADMIN.name,
  FIRST_ADMIN_EMAIL: ADMIN.email,
  FIRST_ADMIN_PASSWORD: ADMIN.password,
  SHOP_WHATSAPP_NUMBER: "9779812345678",
  // Lets a flag change made through the API show on the site straight away.
  WEB_REVALIDATE_URL: `${WEB_URL}/api/revalidate`,
  REVALIDATE_SECRET,
  // The whole suite comes from one address, so the usual 300 a quarter hour is not enough.
  RATE_LIMIT_GLOBAL: "100000",
};

const webEnv = {
  REVALIDATE_SECRET,
  // The whole suite comes from one address, so the usual 300 a quarter hour is not enough.
  RATE_LIMIT_GLOBAL: "100000",
  NEXT_PUBLIC_API_URL: API_URL,
  NEXT_PUBLIC_SITE_URL: WEB_URL,
  NEXT_DIST_DIR: ".next-e2e",
};

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Phones first: most customers order from one.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /(storefront|admin-ui|admin-catalog)\.spec\.ts/,
    },
  ],
  // Started in order, each one waited for: database, then the seeded API, then the built web app.
  webServer: [
    {
      command: "node scripts/mongo.mjs",
      port: PORTS.mongo,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @momento/api exec tsx src/seed/index.ts && pnpm --filter @momento/api exec tsx src/server.ts",
      url: `${API_URL}/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: apiEnv,
    },
    {
      command:
        "node scripts/clean-web.mjs && pnpm --filter @momento/web build && pnpm --filter @momento/web exec next start --port " +
        PORTS.web,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: webEnv,
    },
  ],
});
