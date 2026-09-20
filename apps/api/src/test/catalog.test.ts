import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CategoryModel } from "../models/Category";
import { ProductModel } from "../models/Product";
import { ServiceModel } from "../models/Service";
import { anon, createCatalog, loginAs, testApp } from "./helpers";

describe("products", () => {
  it("public list is paginated, active-only and searchable", async () => {
    const app = testApp();
    const { category } = await createCatalog();
    await ProductModel.create({
      title: "Hidden Frame",
      slug: "hidden",
      categoryId: category._id,
      basePrice: 1,
      isActive: false,
    });
    await ProductModel.create({
      title: "Wall Frame",
      slug: "wall-frame",
      categoryId: category._id,
      basePrice: 900,
      isFeatured: true,
    });

    const all = await anon(app).get("/products?limit=2");
    expect(all.status).toBe(200);
    expect(all.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(all.body.data).toHaveLength(2);
    expect(JSON.stringify(all.body)).not.toContain("Hidden Frame");
    expect(all.body.data[0]).toHaveProperty("id");
    expect(all.body.data[0]).not.toHaveProperty("_id");

    const featured = await anon(app).get("/products?featured=true");
    expect(featured.body.data.map((p: { slug: string }) => p.slug)).toEqual(["wall-frame"]);

    const search = await anon(app).get("/products?q=hardcover");
    expect(search.body.data.map((p: { slug: string }) => p.slug)).toEqual(["classic-photo-book"]);

    const bySlugCategory = await anon(app).get("/products?category=photo-books&sort=price_asc");
    expect(bySlugCategory.body.data.map((p: { slug: string }) => p.slug)).toEqual([
      "photo-magnet",
      "wall-frame",
      "classic-photo-book",
    ]);
  });

  it("gets by id or slug, hides inactive products from the public but not from staff", async () => {
    const app = testApp();
    const { book, category } = await createCatalog();
    const inactive = await ProductModel.create({
      title: "Old",
      slug: "old",
      categoryId: category._id,
      basePrice: 1,
      isActive: false,
    });

    expect((await anon(app).get(`/products/${book.id}`)).body.data.slug).toBe("classic-photo-book");
    expect((await anon(app).get("/products/classic-photo-book")).body.data.id).toBe(book.id);
    expect((await anon(app).get("/products/old")).status).toBe(404);

    const staff = await loginAs(app, "staff");
    expect((await staff.get(`/products/${inactive.id}`)).status).toBe(200);
    expect((await staff.get("/products?includeInactive=true")).body.meta.total).toBe(3);
    expect((await anon(app).get("/products?includeInactive=true")).body.meta.total).toBe(2);
  });

  it("validates input and enforces unique slugs", async () => {
    const app = testApp();
    const { category } = await createCatalog();
    const staff = await loginAs(app, "staff");
    const body = {
      title: "Canvas",
      slug: "canvas",
      categoryId: category.id,
      basePrice: 1200,
      variants: [{ size: "12x18", price: 1200 }],
      specs: [{ label: "Material", value: "Cotton" }],
      faqs: [{ question: "Delivery?", answer: "2 days" }],
    };

    const created = await staff.post("/products").send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.variants[0]).toHaveProperty("id");
    expect(created.body.data.faqs).toHaveLength(1);

    expect((await staff.post("/products").send(body)).status).toBe(409);
    expect((await staff.post("/products").send({ ...body, slug: "Bad Slug!" })).status).toBe(400);
    expect((await staff.post("/products").send({ ...body, slug: "x", basePrice: -5 })).status).toBe(
      400,
    );
    expect(
      (await staff.post("/products").send({ ...body, slug: "y", categoryId: "d".repeat(24) }))
        .status,
    ).toBe(400);
    expect((await anon(app).post("/products").send(body)).status).toBe(401);
  });

  it("keeps variant ids stable when the client sends them back on update", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const admin = await loginAs(app, "admin");
    const keep = book.variants[0]!;

    const res = await admin.patch(`/products/${book.id}`).send({
      variants: [{ id: keep.id, size: "A5", price: 1600 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.variants).toHaveLength(1);
    expect(res.body.data.variants[0]).toMatchObject({ id: keep.id, price: 1600 });
  });

  it("only admins can delete", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const staff = await loginAs(app, "staff");
    expect((await staff.delete(`/products/${magnet.id}`)).status).toBe(403);
    const admin = await loginAs(app, "admin");
    expect((await admin.delete(`/products/${magnet.id}`)).status).toBe(204);
    expect((await admin.delete(`/products/${magnet.id}`)).status).toBe(404);
  });

  it("rejects NoSQL operator injection in query strings", async () => {
    const app = testApp();
    await createCatalog();
    const res = await anon(app).get("/products?category[$ne]=x");
    expect(res.status).toBe(400);
  });
});

describe("categories, services and home sections", () => {
  it("categories: public read, admin write, ordering", async () => {
    const app = testApp();
    await CategoryModel.create({ name: "B", slug: "b", order: 2 });
    await CategoryModel.create({ name: "A", slug: "a", order: 1 });
    await CategoryModel.create({ name: "Off", slug: "off", order: 0, isActive: false });

    const res = await anon(app).get("/categories");
    expect(res.body.data.map((c: { slug: string }) => c.slug)).toEqual(["a", "b"]);
    expect((await anon(app).get("/categories/off")).status).toBe(404);

    const admin = await loginAs(app, "admin");
    const created = await admin.post("/categories").send({ name: "Frames", slug: "frames" });
    expect(created.status).toBe(201);
    const updated = await admin
      .patch(`/categories/${created.body.data.id}`)
      .send({ name: "Photo Frames" });
    expect(updated.body.data.name).toBe("Photo Frames");
    expect((await admin.post("/categories").send({ name: "Dup", slug: "frames" })).status).toBe(
      409,
    );
  });

  it("services: showOnHome filter and text index", async () => {
    const app = testApp();
    await ServiceModel.create({
      title: "Photo Restoration",
      slug: "restoration",
      showOnHome: true,
      order: 1,
    });
    await ServiceModel.create({ title: "Album Design", slug: "album-design", order: 2 });

    const home = await anon(app).get("/services?showOnHome=true");
    expect(home.body.data.map((s: { slug: string }) => s.slug)).toEqual(["restoration"]);
    expect((await anon(app).get("/services/album-design")).body.data.title).toBe("Album Design");
  });

  it("home sections: hidden ones are staff-only", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    await admin.post("/home-sections").send({ type: "hero", title: "Hero", order: 1 });
    await admin
      .post("/home-sections")
      .send({ type: "gallery", title: "Draft", order: 2, isVisible: false });

    expect((await anon(app).get("/home-sections")).body.data).toHaveLength(1);
    expect((await admin.get("/home-sections?includeInactive=true")).body.data).toHaveLength(2);
    expect((await admin.post("/home-sections").send({ type: "nope", title: "x" })).status).toBe(
      400,
    );
  });

  it("coupons: admin CRUD with code normalisation and percent cap", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const ok = await admin.post("/coupons").send({ code: "dashain20", type: "percent", value: 20 });
    expect(ok.status).toBe(201);
    expect(ok.body.data.code).toBe("DASHAIN20");
    expect(
      (await admin.post("/coupons").send({ code: "BAD", type: "percent", value: 120 })).status,
    ).toBe(400);
    expect(
      (await admin.post("/coupons").send({ code: "DASHAIN20", type: "fixed", value: 5 })).status,
    ).toBe(409);
    expect((await anon(app).get("/coupons")).status).toBe(401);
  });
});

describe("settings", () => {
  it("returns defaults publicly and lets only admins update", async () => {
    const app = testApp();
    const first = await anon(app).get("/settings");
    expect(first.status).toBe(200);
    expect(first.body.data.deliveryFees).toMatchObject({ insideValley: 100, outsideValley: 250 });

    const staff = await loginAs(app, "staff");
    expect((await staff.put("/settings").send(first.body.data)).status).toBe(403);

    const admin = await loginAs(app, "admin");
    const next = {
      shopWhatsappNumber: "9779801234567",
      deliveryFees: { insideValley: 80, outsideValley: 200, freeDeliveryThreshold: 5000 },
      socialLinks: { instagram: "https://instagram.com/momento" },
      paymentDetails: { esewaId: "9801234567" },
      seo: {},
    };
    const saved = await admin.put("/settings").send(next);
    expect(saved.status).toBe(200);
    expect((await anon(app).get("/settings")).body.data).toMatchObject(next);
    expect((await admin.put("/settings").send({ ...next, shopWhatsappNumber: "abc" })).status).toBe(
      400,
    );
  });
});

describe("POST /uploads/signature", () => {
  it("returns a valid Cloudinary signature for staff", async () => {
    const app = testApp();
    const staff = await loginAs(app, "staff");
    const res = await staff.post("/uploads/signature").send({ folder: "products" });
    expect(res.status).toBe(200);
    const { cloudName, apiKey, timestamp, folder, signature } = res.body.data;
    expect(cloudName).toBe("demo-cloud");
    expect(apiKey).toBe("123456789");
    expect(folder).toBe("momento/products");
    const expected = createHash("sha1")
      .update(`folder=momento/products&timestamp=${timestamp}cloudinary-test-secret`)
      .digest("hex");
    expect(signature).toBe(expected);
    expect(JSON.stringify(res.body)).not.toContain("cloudinary-test-secret");
  });

  it("requires a session and an allow-listed folder", async () => {
    const app = testApp();
    expect((await anon(app).post("/uploads/signature").send({ folder: "products" })).status).toBe(
      401,
    );
    const staff = await loginAs(app, "staff");
    expect((await staff.post("/uploads/signature").send({ folder: "../etc" })).status).toBe(400);
    expect((await staff.post("/uploads/signature").send({})).status).toBe(400);
  });
});

describe("products by occasion", () => {
  it("filters the public list by occasion slug and rejects malformed slugs", async () => {
    const app = testApp();
    const { category } = await createCatalog();
    await ProductModel.create({
      title: "Wedding Album",
      slug: "wedding-album",
      categoryId: category._id,
      basePrice: 6500,
      occasions: ["wedding", "baby"],
    });
    const res = await anon(app).get("/products?occasion=wedding");
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(["wedding-album"]);
    expect(res.body.data[0].occasions).toEqual(["wedding", "baby"]);
    expect((await anon(app).get("/products?occasion=nope")).body.data).toHaveLength(0);
    expect((await anon(app).get("/products?occasion[$ne]=x")).status).toBe(400);
  });
});

describe("POST /uploads/order-signature", () => {
  it("is public, always signs the orders folder, and restricts formats", async () => {
    const app = testApp();
    const res = await anon(app).post("/uploads/order-signature").send({ folder: "products" });
    expect(res.status).toBe(200);
    const { timestamp, folder, signature, allowedFormats } = res.body.data;
    expect(folder).toBe("momento/orders");
    expect(allowedFormats).toBe("jpg,jpeg,png,webp,heic");
    const expected = createHash("sha1")
      .update(
        `allowed_formats=${allowedFormats}&folder=momento/orders&timestamp=${timestamp}cloudinary-test-secret`,
      )
      .digest("hex");
    expect(signature).toBe(expected);
    expect(JSON.stringify(res.body)).not.toContain("cloudinary-test-secret");
  });
});
