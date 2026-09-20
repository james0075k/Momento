import { expect, test, type Page } from "@playwright/test";
import { ADMIN } from "../env";
import { signIn, signOut } from "./admin-helpers";

test.describe("admin panel: sign in and dashboard", () => {
  test("a visitor without a session is sent to the login page and back after signing in", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    // Private pages are not for search engines.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("a wrong password shows a clear message and stays on the login page", async ({ page }) => {
    await signIn(page, ADMIN.email, "not-the-right-password-1", { expectSuccess: false });
    await expect(page.locator("form [role=alert]")).toContainText("Invalid email or password");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the dashboard shows the shop numbers, and signing out ends the session", async ({
    page,
  }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    for (const label of [
      "Orders today",
      "Revenue today",
      "Waiting for payment",
      "Revenue this month",
      "Reviews to approve",
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Orders this month by status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top products this month" })).toBeVisible();

    // The shop's offer bar and footer are not part of the admin area.
    await expect(page.getByRole("region", { name: "Offer" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);

    await signOut(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a next link that points outside the admin area is ignored", async ({ page }) => {
    await page.goto("/admin/login?next=https%3A%2F%2Fevil.example");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await signOut(page);
  });

  test("the panel is not listed for search engines", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
  });
});
