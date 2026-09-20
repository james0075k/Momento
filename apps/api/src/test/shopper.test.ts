import { describe, expect, it } from "vitest";
import { OrderModel, ProductModel } from "../models";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

const SETTINGS = {
  shopWhatsappNumber: "9779801234567",
  deliveryFees: { insideValley: 100, outsideValley: 250 },
  socialLinks: {},
  paymentDetails: {},
  seo: {},
};

async function turnOn(app: ReturnType<typeof testApp>, features: Record<string, boolean>) {
  const admin = await loginAs(app, "admin");
  await admin.put("/settings").send({ ...SETTINGS, features });
}

let orderNumber = 0;
async function orderOf(products: Array<{ _id: unknown }>, status = "pending_payment") {
  orderNumber += 1;
  return OrderModel.create({
    code: `MOM-2026-${String(orderNumber).padStart(4, "0")}`,
    customer: customer(),
    items: products.map((product) => ({
      productId: product._id,
      title: "x",
      unitPrice: 100,
      quantity: 1,
      lineTotal: 100,
    })),
    subtotal: 100,
    deliveryFee: 0,
    discount: 0,
    total: 100,
    status,
    paymentMethod: "whatsapp",
  });
}

describe("GET /products?ids=", () => {
  it("returns only the named active products and rejects bad ids", async () => {
    const app = testApp();
    const { book, magnet, category } = await createCatalog();
    const hidden = await ProductModel.create({
      title: "Hidden",
      slug: "hidden",
      categoryId: category._id,
      basePrice: 1,
      isActive: false,
    });

    const res = await anon(app).get(`/products?ids=${book.id},${hidden.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(["classic-photo-book"]);

    const both = await anon(app).get(`/products?ids=${book.id},${magnet.id}`);
    expect(both.body.data).toHaveLength(2);

    expect((await anon(app).get("/products?ids=nope")).status).toBe(400);
    const tooMany = Array.from({ length: 25 }, () => book.id).join(",");
    expect((await anon(app).get(`/products?ids=${tooMany}`)).status).toBe(400);
  });
});

describe("GET /products/:id/also-bought", () => {
  it("answers 404 while the flag is off", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    expect((await anon(app).get(`/products/${book.id}/also-bought`)).status).toBe(404);
  });

  it("suggests products bought together in at least two orders, and nothing personal", async () => {
    const app = testApp();
    await turnOn(app, { alsoBought: true });
    const { book, magnet, category } = await createCatalog();
    const frame = await ProductModel.create({
      title: "Frame",
      slug: "frame",
      categoryId: category._id,
      basePrice: 900,
    });

    await orderOf([book, magnet]);
    await orderOf([book, magnet, frame]);
    await orderOf([book, frame]);

    const res = await anon(app).get(`/products/${book.id}/also-bought`);
    expect(res.status).toBe(200);
    const slugs = res.body.data.map((p: { slug: string }) => p.slug);
    expect(slugs.sort()).toEqual(["frame", "photo-magnet"]);
    expect(JSON.stringify(res.body)).not.toMatch(/phone|Sita|MOM-2026|address/);

    // Works by slug too.
    const bySlug = await anon(app).get("/products/classic-photo-book/also-bought");
    expect(bySlug.body.data).toHaveLength(2);
  });

  it("needs two separate orders, ignores cancelled orders and hidden products, and never lists the product itself", async () => {
    const app = testApp();
    await turnOn(app, { alsoBought: true });
    const { book, magnet, category } = await createCatalog();
    const hidden = await ProductModel.create({
      title: "Hidden",
      slug: "hidden",
      categoryId: category._id,
      basePrice: 1,
      isActive: false,
    });

    await orderOf([book, magnet]); // one order: not enough
    let res = await anon(app).get(`/products/${book.id}/also-bought`);
    expect(res.body.data).toEqual([]);

    await orderOf([book, magnet], "cancelled"); // cancelled does not count
    res = await anon(app).get(`/products/${book.id}/also-bought`);
    expect(res.body.data).toEqual([]);

    await orderOf([book, magnet]);
    await orderOf([book, hidden]);
    await orderOf([book, hidden]);
    res = await anon(app).get(`/products/${book.id}/also-bought`);
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(["photo-magnet"]);
  });

  it("is 404 for an unknown or inactive product", async () => {
    const app = testApp();
    await turnOn(app, { alsoBought: true });
    const { category } = await createCatalog();
    const off = await ProductModel.create({
      title: "Off",
      slug: "off",
      categoryId: category._id,
      basePrice: 1,
      isActive: false,
    });
    expect((await anon(app).get("/products/nothing-here/also-bought")).status).toBe(404);
    expect((await anon(app).get(`/products/${off.id}/also-bought`)).status).toBe(404);
  });
});

describe("GET /products?active=", () => {
  it("lets staff list only visible or only hidden products, and is ignored for the public", async () => {
    const app = testApp();
    const { category } = await createCatalog();
    await ProductModel.create({
      title: "Hidden one",
      slug: "hidden-one",
      categoryId: category._id,
      basePrice: 1,
      isActive: false,
    });
    const staff = await loginAs(app, "staff");
    const slugs = async (query: string) =>
      ((await staff.get(`/products${query}`)).body.data as Array<{ slug: string }>).map(
        (p) => p.slug,
      );

    expect(await slugs("?active=false")).toEqual(["hidden-one"]);
    expect(await slugs("?active=true")).toEqual(expect.not.arrayContaining(["hidden-one"]));
    expect(await slugs("?includeInactive=true")).toContain("hidden-one");

    const publicList = await anon(app).get("/products?active=false");
    expect(publicList.body.data.map((p: { slug: string }) => p.slug)).not.toContain("hidden-one");
  });
});
