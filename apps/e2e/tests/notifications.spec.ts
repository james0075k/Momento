import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL } from "../env";
import { adminContext, ALL_OFF, CSRF, setFlags } from "./flags";

const BOOK = "classic-lay-flat-photo-book";
const PHONE = "9800000077";

interface ApiProduct {
  id: string;
  variants: Array<{ id: string }>;
}

async function placeOrder(request: APIRequestContext): Promise<string> {
  const product = (
    (await (await request.get(`${API_URL}/products/${BOOK}`)).json()) as { data: ApiProduct }
  ).data;
  const res = await request.post(`${API_URL}/orders`, {
    headers: CSRF,
    data: {
      customer: {
        name: "Repeat Buyer",
        phone: PHONE,
        address: "Test address, Kathmandu",
        area: "inside_valley",
      },
      items: [{ productId: product.id, variantId: product.variants[0]?.id, quantity: 2 }],
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { data: { code: string } }).data.code;
}

async function track(page: Page, code: string) {
  await page.goto("/track");
  await page.getByLabel(/order code/i).fill(code);
  await page.getByLabel(/phone/i).fill(PHONE);
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByRole("heading", { name: `Order ${code}` })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("notifications and admin tools (Phase 8, slice 3)", () => {
  test.beforeAll(async ({ playwright }) => {
    const admin = await adminContext(playwright);
    await setFlags(admin, ALL_OFF);
    await admin.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    const admin = await adminContext(playwright);
    await setFlags(admin, ALL_OFF);
    await admin.dispose();
  });

  test("with every flag off there is no button and the new routes do not exist", async ({
    page,
    request,
    playwright,
  }) => {
    const code = await placeOrder(request);
    await track(page, code);
    await expect(page.getByRole("button", { name: "Order again" })).toHaveCount(0);

    const admin = await adminContext(playwright);
    for (const path of ["/orders/export.csv", "/customers/export.csv", "/summary/daily"]) {
      expect((await admin.get(`${API_URL}${path}`)).status(), path).toBe(404);
    }
    const internal = await request.post(`${API_URL}/internal/daily-summary`, {
      headers: { ...CSRF, "x-cron-secret": "anything-at-all-here" },
      data: {},
    });
    expect(internal.status()).toBe(404);
    await admin.dispose();
  });

  test("order again refills the cart, and admins can download the CSVs, when switched on", async ({
    page,
    request,
    playwright,
  }) => {
    const admin = await adminContext(playwright);
    const code = await placeOrder(request);
    await setFlags(admin, { orderAgain: true, csvExport: true, dailySummary: true });

    // Order again: the tracking page puts the same items back in the cart.
    await track(page, code);
    const again = page.getByRole("button", { name: "Order again" });
    await expect
      .poll(() => again.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))))
      .toBe(true);
    await again.click();
    await expect(page.getByText(/Added 1 item to your cart/)).toBeVisible();
    await page.getByRole("link", { name: "View your cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText("Classic Lay-Flat Photo Book").first()).toBeVisible();

    // CSV: only a signed-in admin gets it, and it opens cleanly in Excel.
    expect((await request.get(`${API_URL}/orders/export.csv`)).status()).toBe(401);
    const csv = await admin.get(`${API_URL}/orders/export.csv`);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(csv.headers()["content-disposition"]).toContain("attachment");
    const text = await csv.text();
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain("Order code,Created (UTC),Status");
    expect(text).toContain(code);
    expect(text).not.toContain("Test address");

    const customers = await admin.get(`${API_URL}/customers/export.csv`);
    expect(customers.status()).toBe(200);
    expect(await customers.text()).toContain("Repeat Buyer");

    // The summary preview is JSON, and sending needs the scheduler secret.
    const summary = await admin.get(`${API_URL}/summary/daily`);
    expect(summary.status()).toBe(200);
    expect(((await summary.json()) as { data: { day: string } }).data.day).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    const noSecret = await request.post(`${API_URL}/internal/daily-summary`, {
      headers: CSRF,
      data: { dryRun: true },
    });
    expect(noSecret.status()).toBe(404);

    // Off again: the button goes away.
    await setFlags(admin, ALL_OFF);
    await track(page, code);
    await expect(page.getByRole("button", { name: "Order again" })).toHaveCount(0);
    expect((await admin.get(`${API_URL}/orders/export.csv`)).status()).toBe(404);

    await admin.dispose();
  });
});
