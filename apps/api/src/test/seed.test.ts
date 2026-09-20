import { describe, expect, it } from "vitest";
import { CategoryModel } from "../models/Category";
import { HomeSectionModel } from "../models/HomeSection";
import { ProductModel } from "../models/Product";
import { ReviewModel } from "../models/Review";
import { ServiceModel } from "../models/Service";
import { UserModel } from "../models/User";
import { seedAdmin } from "../seed/admin";
import { seedSample } from "../seed/sample";
import { anon, PASSWORD, testApp } from "./helpers";

describe("seedAdmin", () => {
  it("creates an admin who can log in, and is idempotent", async () => {
    const input = { name: "Owner", email: "Owner@Momento.test", password: PASSWORD };
    expect(await seedAdmin(input)).toBe(true);
    expect(await seedAdmin(input)).toBe(false);
    expect(await UserModel.countDocuments()).toBe(1);

    const res = await anon(testApp())
      .post("/auth/login")
      .send({ email: "owner@momento.test", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("admin");
  });

  it("rejects missing values and weak passwords", async () => {
    await expect(seedAdmin({ name: "", email: "", password: "" })).rejects.toThrow();
    await expect(
      seedAdmin({ name: "A", email: "a@momento.test", password: "short" }),
    ).rejects.toThrow();
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe("seedSample", () => {
  it("adds categories, products, services, reviews and home sections, and is idempotent", async () => {
    const first = await seedSample();
    expect(first.categories).toBeGreaterThanOrEqual(3);
    expect(first.products).toBeGreaterThanOrEqual(5);
    expect(first.services).toBeGreaterThanOrEqual(3);
    expect(first.reviews).toBeGreaterThanOrEqual(5);

    const totals = async () => [
      await CategoryModel.countDocuments(),
      await ProductModel.countDocuments(),
      await ServiceModel.countDocuments(),
      await ReviewModel.countDocuments(),
      await HomeSectionModel.countDocuments(),
    ];
    const before = await totals();
    const second = await seedSample();
    expect(second).toEqual({
      categories: 0,
      products: 0,
      services: 0,
      reviews: 0,
      homeSections: 0,
    });
    expect(await totals()).toEqual(before);
  });

  it("produces data the public API can serve", async () => {
    await seedSample();
    const app = testApp();

    const products = await anon(app).get("/products?category=photo-books");
    expect(products.body.data.length).toBeGreaterThan(0);
    expect(products.body.data[0].categoryId).toBeTruthy();

    const reviews = await anon(app).get("/reviews");
    expect(reviews.body.data.length).toBeGreaterThan(0);
    expect(reviews.body.data.every((r: { status: string }) => r.status === "approved")).toBe(true);

    expect((await anon(app).get("/services")).body.data.length).toBeGreaterThan(0);
    expect((await anon(app).get("/home-sections")).body.data.length).toBeGreaterThan(0);
  });

  it("sample products can be ordered end to end", async () => {
    await seedSample();
    const app = testApp();
    const product = (await anon(app).get("/products/classic-lay-flat-photo-book")).body.data;
    const order = await anon(app)
      .post("/orders")
      .send({
        customer: { name: "Test", phone: "9800000001", address: "Thamel", area: "inside_valley" },
        items: [{ productId: product.id, variantId: product.variants[1].id, quantity: 1 }],
      });
    expect(order.status).toBe(201);
    expect(order.body.data.subtotal).toBe(3200);
  });
});
