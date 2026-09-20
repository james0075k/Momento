import { expect, test, type Page } from "@playwright/test";
import { API_URL } from "../env";
import { signIn, signOut } from "./admin-helpers";
import { adminContext, CSRF } from "./flags";

const STAFF = { email: "e2e-staff@example.com", password: "E2e-Staff-Pass-2026!" };
const DEMO_IMAGE = "https://res.cloudinary.com/demo/image/upload/sample.jpg";

test.describe.configure({ mode: "serial" });

/** Names must be different on desktop and phone runs, which share one database. */
const stamp = () => test.info().project.name;

async function publicStatus(page: Page, path: string): Promise<number> {
  return (await page.goto(path))?.status() ?? 0;
}

test.describe("admin panel: catalogue and content", () => {
  test.beforeAll(async ({ playwright }) => {
    const admin = await adminContext(playwright);
    // The staff account used to check what staff cannot do. Ignored if an earlier project already made it.
    await admin.post(`${API_URL}/auth/users`, {
      headers: CSRF,
      data: { name: "E2E Staff", email: STAFF.email, password: STAFF.password, role: "staff" },
    });
    await admin.dispose();
  });

  test("ACCEPTANCE: an admin adds a service and sees it on the home page without touching code", async ({
    page,
  }) => {
    const title = `E2E Service ${stamp()}`;
    const slug = `e2e-service-${stamp()}`;
    await signIn(page);
    await page.goto("/admin/services/new");
    await page.getByLabel("Title").fill(title);
    // The web address follows the title until it is edited by hand.
    await expect(page.getByLabel("Web address")).toHaveValue(slug);
    await page.getByRole("textbox", { name: "Service description" }).click();
    await page.keyboard.type("We do this for you, from start to finish.");
    await page.getByLabel("Starting price (NPR)").fill("750");
    await page.getByRole("switch", { name: "Show on the home page" }).click();
    await page.getByRole("button", { name: "Create service" }).click();

    await expect(page).toHaveURL(/\/admin\/services$/);
    await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();

    // On the home page within seconds (the API refreshes the website's cache after every change).
    await expect
      .poll(
        async () => {
          await page.goto("/");
          return page.getByText(title).count();
        },
        { timeout: 30_000, intervals: [1000, 2000] },
      )
      .toBeGreaterThan(0);
    expect(await publicStatus(page, `/services/${slug}`)).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });

  test("create a product with sizes and an image, see it in the shop, then hide it", async ({
    page,
  }) => {
    const title = `E2E Album ${stamp()}`;
    const slug = `e2e-album-${stamp()}`;
    await signIn(page);
    await page.goto("/admin/products/new");

    // Leaving it empty shows what is missing, in plain words.
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText("This is required.").first()).toBeVisible();
    await expect(page.locator("form [role=alert]").last()).toContainText("fix the fields");

    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Category", { exact: true }).selectOption({ index: 1 });
    await page.getByLabel("Short description").fill("A test album made by the browser test.");
    await page.getByLabel("Price (NPR)", { exact: true }).first().fill("1234");
    await page.getByPlaceholder("Or paste a Cloudinary image link").fill(DEMO_IMAGE);
    await page.getByRole("button", { name: "Add link", exact: true }).last().click();
    await expect(page.getByText("Cover image")).toBeVisible();
    await page.getByRole("button", { name: "Add a size" }).click();
    await page.locator("#v-size-0").fill("A5");
    await page.locator("#v-price-0").fill("1500");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();

    await expect
      .poll(() => publicStatus(page, `/shop/${slug}`), { timeout: 30_000, intervals: [1000, 2000] })
      .toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

    // Hide it: the shop stops showing it.
    await page.goto("/admin/products");
    await page.getByRole("link", { name: `Edit ${title}` }).click();
    await page.getByRole("switch", { name: "Visible in the shop" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(
      page.getByRole("row", { name: new RegExp(title) }).getByText("Hidden"),
    ).toBeVisible();
    await expect
      .poll(() => publicStatus(page, `/shop/${slug}`), { timeout: 30_000, intervals: [1000, 2000] })
      .toBe(404);
  });

  test("a web address that is already taken is refused with a clear message", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/services/new");
    await page.getByLabel("Title").fill("Duplicate");
    await page.getByLabel("Web address").fill(`e2e-service-${stamp()}`);
    await page.getByRole("button", { name: "Create service" }).click();
    await expect(page.getByText("That web address is already used")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/services\/new$/);
  });

  test("categories and coupons: create, and see them listed", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByLabel("Name").fill(`E2E Category ${stamp()}`);
    await page.getByRole("button", { name: "Save category" }).click();
    await expect(
      page.getByRole("row", { name: new RegExp(`E2E Category ${stamp()}`) }),
    ).toBeVisible();

    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: "New coupon" }).click();
    await page.getByLabel("Code").fill(`E2E${stamp().toUpperCase()}`);
    await page.getByLabel(/Percent \(1 to 100\)/).fill("15");
    await page.getByRole("button", { name: "Save coupon" }).click();
    await expect(
      page
        .getByRole("row", { name: new RegExp(`E2E${stamp().toUpperCase()}`) })
        .getByText("15% off"),
    ).toBeVisible();

    // A percent above 100 is refused before it is sent.
    await page.getByRole("button", { name: "New coupon" }).click();
    await page.getByLabel("Code").fill("TOOBIG");
    await page.getByLabel(/Percent \(1 to 100\)/).fill("150");
    await page.getByRole("button", { name: "Save coupon" }).click();
    await expect(page.getByText("Percent coupons cannot exceed 100")).toBeVisible();
  });

  test("home page sections can be moved, and the order is kept", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/home");
    const titles = () => page.locator("ol > li p.font-medium").allInnerTexts();
    await expect.poll(async () => (await titles()).length).toBeGreaterThan(1);
    const before = await titles();

    await page.getByRole("button", { name: `Move ${before[0]} down` }).click();
    await expect.poll(titles).toEqual([before[1], before[0], ...before.slice(2)]);
    await page.reload();
    await expect.poll(titles).toEqual([before[1], before[0], ...before.slice(2)]);

    // Put it back so other tests see the usual order.
    await page.getByRole("button", { name: `Move ${before[0]} up` }).click();
    await expect.poll(titles).toEqual(before);
  });

  test("gift cards explain when the feature is switched off", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/gift-cards");
    await expect(page.getByText("Gift cards are switched off.")).toBeVisible();
  });

  test("staff see a smaller menu, and the API refuses what they may not do", async ({ page }) => {
    await signIn(page, STAFF.email, STAFF.password);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const menu = page.getByRole("button", { name: "Open menu" });
    if (await menu.isVisible()) await menu.click();
    const nav = page.getByRole("navigation", { name: /^Admin/ });
    await expect(nav.getByRole("link", { name: "Products" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Coupons" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Gift cards" })).toHaveCount(0);
    if (await menu.isVisible()) await page.keyboard.press("Escape");

    // Going straight to an admin-only page shows the API's refusal, not the data.
    await page.goto("/admin/coupons");
    await expect(page.locator("main [role=alert]")).toContainText("Forbidden");
    await signOut(page);
  });
});
