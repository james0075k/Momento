import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env";
import { ReviewModel } from "../models";
import { anon, createCatalog, loginAs, testApp } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  delete env.WEB_REVALIDATE_URL;
  delete env.REVALIDATE_SECRET;
});

function configure() {
  env.WEB_REVALIDATE_URL = "https://web.example/api/revalidate";
  env.REVALIDATE_SECRET = "a-long-shared-secret-value";
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const tags = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map((call) => JSON.parse((call[1] as RequestInit).body as string).tag);

describe("refreshing the website after admin changes", () => {
  it("asks for the right tag after a successful write, and never after a read", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const fetchMock = configure();

    await admin.get("/services");
    await anon(app).get("/products");
    expect(fetchMock).not.toHaveBeenCalled();

    const created = await admin
      .post("/services")
      .send({ title: "Restoration", slug: "restoration" });
    expect(created.status).toBe(201);
    await vi.waitFor(() => expect(tags(fetchMock)).toEqual(["services"]));

    await admin.patch(`/services/${created.body.data.id}`).send({ showOnHome: true });
    await vi.waitFor(() => expect(tags(fetchMock)).toEqual(["services", "services"]));
  });

  it("covers products, categories, home sections and reviews", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const { book, category } = await createCatalog();
    const fetchMock = configure();

    await admin.patch(`/products/${book.id}`).send({ isFeatured: true });
    await admin.patch(`/categories/${category.id}`).send({ order: 3 });
    const section = await admin
      .post("/home-sections")
      .send({ type: "featured", title: "Featured", order: 1 });
    expect(section.status).toBe(201);
    const review = await ReviewModel.create({
      productId: book._id,
      name: "A",
      rating: 5,
      comment: "ok",
    });
    await admin.patch(`/reviews/${review.id}/status`).send({ status: "approved" });

    await vi.waitFor(() =>
      expect(new Set(tags(fetchMock))).toEqual(
        new Set(["products", "categories", "home-sections", "reviews"]),
      ),
    );
  });

  it("does not ask after a refused or failed write", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const fetchMock = configure();

    expect((await admin.post("/services").send({ title: "" })).status).toBe(400); // invalid
    expect((await anon(app).post("/services").send({ title: "x", slug: "x" })).status).toBe(401);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the website address is not configured", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await admin.post("/services").send({ title: "A", slug: "a" })).status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
