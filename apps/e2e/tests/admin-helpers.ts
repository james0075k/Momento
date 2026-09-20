import { expect, type Page } from "@playwright/test";
import { ADMIN } from "../env";

/** Opens the phone menu when there is one (the sidebar is always visible on wide screens). */
export async function openMenuIfNeeded(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

export async function signIn(
  page: Page,
  email: string = ADMIN.email,
  password: string = ADMIN.password,
  options: { expectSuccess?: boolean } = {},
) {
  await page.goto("/admin/login");
  const submit = page.getByRole("button", { name: "Sign in" });
  await expect
    .poll(() => submit.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))))
    .toBe(true);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await submit.click();
  // Signing in takes a moment; going anywhere before it finishes would lose the session.
  if (options.expectSuccess !== false) await expect(page).toHaveURL(/\/admin$/);
}

export async function signOut(page: Page) {
  await openMenuIfNeeded(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
}
