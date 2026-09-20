import { expect, test, type APIRequestContext } from "@playwright/test";
import { API_URL } from "../env";
import { adminContext, ALL_OFF, CSRF, setFlags } from "./flags";

interface ApiProduct {
  id: string;
  slug: string;
  variants: Array<{ id: string }>;
}

async function product(request: APIRequestContext, slug: string): Promise<ApiProduct> {
  const res = await request.get(`${API_URL}/products/${slug}`);
  return ((await res.json()) as { data: ApiProduct }).data;
}

/** Places a real order through the public API, the way the checkout does. */
async function order(request: APIRequestContext, slugs: string[]) {
  const items = [];
  for (const slug of slugs) {
    const found = await product(request, slug);
    items.push({ productId: found.id, variantId: found.variants[0]?.id, quantity: 1 });
  }
  const res = await request.post(`${API_URL}/orders`, {
    headers: CSRF,
    data: {
      customer: {
        name: "Test Buyer",
        phone: "9800000001",
        address: "Test address, Kathmandu",
        area: "inside_valley",
      },
      items,
    },
  });
  expect(res.status()).toBe(201);
}

const BOOK = "classic-lay-flat-photo-book";
const MAGNET = "photo-magnet";

test.describe.configure({ mode: "serial" });

test.describe("shopper features (Phase 8, slice 1)", () => {
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

  test("with every flag off there is no trace of the features", async ({ page, request }) => {
    await page.goto("/shop");
    await expect(
      page.getByRole("link", { name: /Classic Lay-Flat Photo Book/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /to wishlist/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Wishlist/ })).toHaveCount(0);

    expect((await page.goto("/wishlist"))?.status()).toBe(404);

    await page.goto(`/shop/${BOOK}`);
    await expect(page.getByRole("group", { name: "Share this page" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recently viewed" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Customers also bought" })).toHaveCount(0);

    const id = (await product(request, BOOK)).id;
    expect((await request.get(`${API_URL}/products/${id}/also-bought`)).status()).toBe(404);
  });

  test("wishlist, recently viewed, also bought and share work when switched on, and vanish when switched off", async ({
    page,
    request,
    playwright,
  }) => {
    const admin = await adminContext(playwright);

    // Two separate orders with the book and the magnet make them "bought together".
    await order(request, [BOOK, MAGNET]);
    await order(request, [BOOK, MAGNET]);
    await setFlags(admin, { wishlist: true, recentlyViewed: true, alsoBought: true, share: true });

    // Wishlist: save from the shop, see it in the header and on the page, keep it after a reload.
    await page.goto("/shop");
    const heart = page.getByRole("button", {
      name: /^Save Classic Lay-Flat Photo Book to wishlist/,
    });
    await expect
      .poll(() => heart.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))))
      .toBe(true);
    await heart.click();
    await expect(
      page.getByRole("button", { name: /^Remove Classic Lay-Flat Photo Book from wishlist/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Wishlist, 1 saved" })).toBeVisible();

    await page.goto("/wishlist");
    await expect(page.getByRole("link", { name: /Classic Lay-Flat Photo Book/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: /Classic Lay-Flat Photo Book/ })).toBeVisible();

    // Recently viewed: open the magnet, then the book; the book page lists the magnet.
    await page.goto(`/shop/${MAGNET}`);
    await page.goto(`/shop/${BOOK}`);
    const recent = page.getByRole("region", { name: "Recently viewed" });
    await expect(recent.getByRole("link", { name: /Photo Magnet/ })).toBeVisible();

    // Also bought and share, on the same page.
    await expect(page.getByRole("heading", { name: "Customers also bought" })).toBeVisible();
    const share = page.getByRole("group", { name: "Share this page" });
    await expect(share.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/\?text=/,
    );
    await expect(share.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      /facebook\.com\/sharer/,
    );

    // Switch everything off again: the pages go back to how they were.
    await setFlags(admin, ALL_OFF);
    await page.goto("/shop");
    await expect(page.getByRole("button", { name: /to wishlist|from wishlist/ })).toHaveCount(0);
    expect((await page.goto("/wishlist"))?.status()).toBe(404);
    await page.goto(`/shop/${BOOK}`);
    await expect(page.getByRole("group", { name: "Share this page" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Customers also bought" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recently viewed" })).toHaveCount(0);

    await admin.dispose();
  });
});
