import { expect, test, type Locator } from "@playwright/test";

/**
 * Waits until React has attached to an element. Clicking earlier does nothing (or, for a form
 * button, submits the form the old-fashioned way), which makes tests flaky on fast machines.
 */
async function hydrated(locator: Locator) {
  await expect
    .poll(() => locator.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))))
    .toBe(true);
}

const CUSTOMER = {
  name: "Sita Sharma",
  phone: "9841234567",
  address: "Baneshwor, near the temple, Kathmandu",
};

test.describe("storefront", () => {
  test("browse, add to cart, check out and hand off to WhatsApp", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (/content security policy/i.test(message.text())) problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));

    // Browse: home, then the shop from the footer (visible on every screen size).
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Footer" })
      .getByRole("link", { name: "All products" })
      .click();
    await expect(page).toHaveURL(/\/shop$/);

    // Product page: pick a product and add it.
    await page
      .getByRole("link", { name: /Classic Lay-Flat Photo Book/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/shop\/classic-lay-flat-photo-book/);
    // Phones show a second, sticky copy of the button; use the one in the page.
    const addToCart = page.getByRole("button", { name: "Add to cart" }).first();
    await hydrated(addToCart);
    await addToCart.click();
    await expect(page.getByRole("button", { name: "Added" }).first()).toBeVisible();

    // Cart.
    await page.getByRole("link", { name: /^Cart, 1 item/ }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText("Classic Lay-Flat Photo Book").first()).toBeVisible();
    await page.getByRole("link", { name: "Checkout" }).first().click();
    await expect(page).toHaveURL(/\/checkout$/);

    // Checkout: an empty form is refused, then a valid one is placed.
    const placeOrder = page.getByRole("button", { name: /^Place order/ });
    await hydrated(placeOrder);
    await placeOrder.click();
    await expect(page.locator("form [role=alert]").first()).toBeVisible();

    await page.getByLabel("Full name").fill(CUSTOMER.name);
    await page.getByLabel("Phone number").fill(CUSTOMER.phone);
    await page.locator('input[name="area"]').first().check();
    await page.getByLabel("Delivery address").fill(CUSTOMER.address);
    await placeOrder.click();

    // Confirmation with the order code and the wa.me hand-off.
    await expect(page).toHaveURL(/\/order\/MOM-\d{4}-\d{4,}/);
    await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
    const code = /MOM-\d{4}-\d{4,}/.exec(page.url())?.[0] ?? "";
    expect(code).not.toBe("");

    const whatsapp = page.getByRole("link", { name: /Send order on WhatsApp/ });
    const href = (await whatsapp.getAttribute("href")) ?? "";
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const message = decodeURIComponent(href.split("?text=")[1] ?? "");
    expect(message).toContain(code);
    expect(message).toContain("Classic Lay-Flat Photo Book");
    expect(message).toContain(CUSTOMER.name);
    await expect(whatsapp).toHaveAttribute("rel", /noopener/);

    // The customer can look the order up with the code and phone.
    await page.goto("/track");
    await page.getByLabel(/order code/i).fill(code);
    await page.getByLabel(/phone/i).fill(CUSTOMER.phone);
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText(code).first()).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "(current step)" })).toContainText(
      "Order placed",
    );

    expect(problems).toEqual([]);
  });

  test("tracking refuses a wrong phone number and reveals nothing", async ({ page }) => {
    await page.goto("/track");
    await page.getByLabel(/order code/i).fill("MOM-2026-9999");
    await page.getByLabel(/phone/i).fill("9800000000");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText(/could not find an order/i)).toBeVisible();
    await expect(page.getByText(/baneshwor/i)).toHaveCount(0);
  });

  test("sends security headers and keeps private pages out of search", async ({
    request,
    page,
  }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();

    await page.goto("/cart");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("sitemap lists the products and robots.txt points to it", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/shop/classic-lay-flat-photo-book");
    expect(sitemap).not.toContain("/cart");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
  });
});
