import { expect, test, type APIRequestContext } from "@playwright/test";
import { ADMIN, API_URL } from "../env";

/**
 * The admin panel UI (Phase 5) is not built yet, so these tests drive the same operations through
 * the API the panel will call, with real cookies and the CSRF header. When /admin exists, replace
 * them with browser tests of the same steps.
 */
const headers = { "X-Requested-With": "momento" };

async function loginAsAdmin(request: APIRequestContext) {
  const res = await request.post(`${API_URL}/auth/login`, {
    headers,
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(res.status()).toBe(200);
  return res;
}

test.describe("admin (API)", () => {
  test("login sets httpOnly cookies, and a wrong password is refused", async ({ playwright }) => {
    const bad = await playwright.request.newContext();
    const refused = await bad.post(`${API_URL}/auth/login`, {
      headers,
      data: { email: ADMIN.email, password: "not-the-password-1" },
    });
    expect(refused.status()).toBe(401);
    await bad.dispose();

    const ctx = await playwright.request.newContext();
    const res = await loginAsAdmin(ctx);
    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie");
    expect(cookies.length).toBeGreaterThanOrEqual(2);
    for (const cookie of cookies) expect(cookie.value.toLowerCase()).toContain("httponly");
    expect(JSON.stringify(await res.json())).not.toMatch(/passwordHash|argon2/);

    expect((await ctx.get(`${API_URL}/auth/me`)).status()).toBe(200);
    await ctx.dispose();
  });

  test("state-changing requests without the CSRF header are refused", async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    await loginAsAdmin(ctx);
    const res = await ctx.post(`${API_URL}/categories`, { data: { name: "X", slug: "x-csrf" } });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("create a product, then approve a customer review of it", async ({ playwright }) => {
    const admin = await playwright.request.newContext();
    await loginAsAdmin(admin);
    const customer = await playwright.request.newContext();

    // Create a product in an existing category.
    const categories = (await (await admin.get(`${API_URL}/categories`)).json()) as {
      data: Array<{ id: string }>;
    };
    const categoryId = categories.data[0]?.id;
    expect(categoryId).toBeTruthy();

    const slug = `e2e-product-${Date.now()}`;
    const created = await admin.post(`${API_URL}/products`, {
      headers,
      data: { title: "E2E Test Frame", slug, categoryId, basePrice: 1234 },
    });
    expect(created.status()).toBe(201);
    const product = ((await created.json()) as { data: { id: string } }).data;
    expect((await customer.get(`${API_URL}/products/${slug}`)).status()).toBe(200);

    // A customer (no session) leaves a review. It starts hidden.
    const submitted = await customer.post(`${API_URL}/reviews`, {
      headers,
      data: { productId: product.id, name: "Rita", rating: 5, comment: "Lovely frame." },
    });
    expect(submitted.status()).toBe(201);
    const review = ((await submitted.json()) as { data: { id: string; status: string } }).data;
    expect(review.status).toBe("pending");

    const hidden = (await (
      await customer.get(`${API_URL}/reviews?productId=${product.id}`)
    ).json()) as {
      data: unknown[];
    };
    expect(hidden.data).toHaveLength(0);

    // The admin approves it, and it becomes public.
    const approved = await admin.patch(`${API_URL}/reviews/${review.id}/status`, {
      headers,
      data: { status: "approved" },
    });
    expect(approved.status()).toBe(200);
    const visible = (await (
      await customer.get(`${API_URL}/reviews?productId=${product.id}`)
    ).json()) as {
      data: Array<{ name: string }>;
    };
    expect(visible.data.map((r) => r.name)).toEqual(["Rita"]);

    await admin.dispose();
    await customer.dispose();
  });

  test("anonymous callers cannot create products or read orders", async ({ playwright }) => {
    const anon = await playwright.request.newContext();
    const create = await anon.post(`${API_URL}/products`, { headers, data: { title: "x" } });
    expect(create.status()).toBe(401);
    expect((await anon.get(`${API_URL}/orders`)).status()).toBe(401);
    await anon.dispose();
  });

  test("the readiness check reports the database as up", async ({ request }) => {
    const res = await request.get(`${API_URL}/health/ready`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });
});
