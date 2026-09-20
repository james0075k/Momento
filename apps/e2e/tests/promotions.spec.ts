import { expect, test, type APIRequestContext } from "@playwright/test";
import { API_URL } from "../env";
import { adminContext, ALL_OFF, CSRF, setFlags } from "./flags";

const BOOK = "classic-lay-flat-photo-book";
const ALICE = "9812340001";
const FRIEND = "9800000042";

interface ApiProduct {
  id: string;
  variants: Array<{ id: string }>;
}

async function place(request: APIRequestContext, phone: string) {
  const product = (
    (await (await request.get(`${API_URL}/products/${BOOK}`)).json()) as { data: ApiProduct }
  ).data;
  const res = await request.post(`${API_URL}/orders`, {
    headers: CSRF,
    data: {
      customer: {
        name: "Alice Test",
        phone,
        address: "Test address, Kathmandu",
        area: "inside_valley",
      },
      items: [{ productId: product.id, variantId: product.variants[0]?.id, quantity: 1 }],
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { data: { id: string; code: string } }).data;
}

/** Runs a full checkout in the browser with whatever fields the flags show. */
async function startCheckout(page: import("@playwright/test").Page) {
  await page.goto(`/shop/${BOOK}`);
  const add = page.getByRole("button", { name: "Add to cart" }).first();
  await expect
    .poll(() => add.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))))
    .toBe(true);
  await add.click();
  await expect(page.getByRole("button", { name: "Added" }).first()).toBeVisible();
  await page.goto("/checkout");
  await expect(page.getByLabel("Full name")).toBeVisible();
}

const banner = () => ({
  text: "Festival offer",
  href: "/shop",
  couponCode: "E2EFEST",
  startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
});

test.describe.configure({ mode: "serial" });

test.describe("promotions (Phase 8, slice 2)", () => {
  test.beforeAll(async ({ playwright }) => {
    const admin = await adminContext(playwright);
    await setFlags(admin, ALL_OFF, { banner: banner() });
    await admin.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    const admin = await adminContext(playwright);
    await setFlags(admin, ALL_OFF, { banner: null });
    await admin.dispose();
  });

  test("with every flag off, even a saved banner and the new fields stay hidden", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Offer" })).toHaveCount(0);

    await startCheckout(page);
    await expect(page.getByRole("heading", { name: "Referral code" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Gift card" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Coupon" })).toBeVisible();

    expect((await page.goto("/gift-cards"))?.status()).toBe(404);
    expect(
      (
        await request.post(`${API_URL}/gift-cards/balance`, {
          headers: CSRF,
          data: { code: "GC-ABCD-EFGH" },
        })
      ).status(),
    ).toBe(404);
  });

  test("banner, referral and gift card work at checkout, then vanish when switched off", async ({
    page,
    request,
    playwright,
  }) => {
    const admin = await adminContext(playwright);

    // Things the admin sets up: a coupon for the banner, a gift card, and a customer with a referral code.
    const coupon = await admin.post(`${API_URL}/coupons`, {
      headers: CSRF,
      data: { code: "E2EFEST", type: "fixed", value: 100 },
    });
    expect(coupon.status()).toBe(201);

    await setFlags(
      admin,
      { festivalBanner: true, referrals: true, giftCards: true },
      { banner: banner() },
    );

    const card = (
      (await (
        await admin.post(`${API_URL}/gift-cards`, { headers: CSRF, data: { amount: 5000 } })
      ).json()) as {
        data: { code: string };
      }
    ).data;

    const alice = await place(request, ALICE);
    for (const status of ["paid", "printing", "shipped", "delivered"]) {
      const res = await admin.patch(`${API_URL}/orders/${alice.id}/status`, {
        headers: CSRF,
        data: { status },
      });
      expect(res.status()).toBe(200);
    }

    // The customer sees her code on the tracking page.
    await page.goto("/track");
    await page.getByLabel(/order code/i).fill(alice.code);
    await page.getByLabel(/phone/i).fill(ALICE);
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByRole("heading", { name: "Share Momento, earn a reward" })).toBeVisible();
    const referralCode = (
      await page.locator("section[aria-labelledby=referral-title] strong").first().innerText()
    ).trim();
    expect(referralCode).toMatch(/^MOM-[A-Z2-9]{6}$/);

    // The banner shows with its code and a countdown, and following it carries the coupon to checkout.
    await page.goto("/");
    const offer = page.getByRole("region", { name: "Offer" });
    await expect(offer).toContainText("Festival offer");
    await expect(offer).toContainText("E2EFEST");
    await expect(offer).toContainText(/Ends in \d+ (day|hour)/);
    await offer.getByRole("link").click();
    await expect(page).toHaveURL(/\/shop$/);

    await startCheckout(page);
    await expect(page.getByText("E2EFEST", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/takes off NPR 100/).first()).toBeVisible();

    // A friend uses the referral code and the gift card.
    await page
      .getByRole("region", { name: "Referral code" })
      .getByRole("textbox")
      .fill(referralCode);
    await page
      .getByRole("region", { name: "Referral code" })
      .getByRole("button", { name: "Apply" })
      .click();
    await expect(page.getByRole("region", { name: "Referral code" })).toContainText(
      "takes off NPR 100",
    );

    await page.getByRole("region", { name: "Gift card" }).getByRole("textbox").fill(card.code);
    await page
      .getByRole("region", { name: "Gift card" })
      .getByRole("button", { name: "Apply" })
      .click();
    await expect(page.getByRole("region", { name: "Gift card" })).toContainText(
      "has NPR 5,000 to use",
    );

    const summary = page.getByRole("complementary", { name: "Order summary" });
    await expect(summary).toContainText("Referral discount");
    await expect(summary).toContainText("Gift card");

    await page.getByLabel("Full name").fill("Friend Test");
    await page.getByLabel("Phone number").fill(FRIEND);
    await page.locator('input[name="area"]').first().check();
    await page.getByLabel("Delivery address").fill("Friend address, Kathmandu");
    await page.getByRole("button", { name: /^Place order/ }).click();

    await expect(page).toHaveURL(/\/order\/MOM-\d{4}-\d{4,}/);
    await expect(page.locator("dt", { hasText: "Referral discount" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Gift card" })).toBeVisible();
    await expect(page.locator("dl").filter({ hasText: "Total" }).last()).toContainText("NPR 0");

    // The gift card really lost that money, and the balance page agrees.
    const balance = await request.post(`${API_URL}/gift-cards/balance`, {
      headers: CSRF,
      data: { code: card.code },
    });
    const left = ((await balance.json()) as { data: { balance: number } }).data.balance;
    expect(left).toBeLessThan(5000);
    expect(left).toBeGreaterThan(0);

    // Dismissing the banner removes it and its page offset.
    await page.goto("/");
    await page.getByRole("button", { name: "Dismiss offer" }).click();
    await expect(page.getByRole("region", { name: "Offer" })).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.getPropertyValue("--banner-h")),
      )
      .toBe("0px");

    // Switch the flags off: the same site, minus the extras.
    await setFlags(admin, ALL_OFF);
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Offer" })).toHaveCount(0);
    await startCheckout(page);
    await expect(page.getByRole("heading", { name: "Referral code" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Gift card" })).toHaveCount(0);
    expect((await page.goto("/gift-cards"))?.status()).toBe(404);

    await admin.dispose();
  });
});
