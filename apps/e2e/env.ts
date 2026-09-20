/** Ports are off the defaults so the tests never touch a running `pnpm dev`. */
export const PORTS = { mongo: 27117, api: 4100, web: 3200 } as const;
export const WEB_URL = `http://localhost:${PORTS.web}`;
export const API_URL = `http://localhost:${PORTS.api}`;

export const ADMIN = {
  name: "E2E Admin",
  email: "e2e-admin@example.com",
  password: "E2e-Admin-Pass-2026!",
} as const;

/** Shared by the API and the web app so flag changes show at once. Test-only. */
export const REVALIDATE_SECRET = "e2e-revalidate-secret-value-0001";
