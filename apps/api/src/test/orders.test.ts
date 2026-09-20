import { DEFAULT_SETTINGS } from "@momento/shared";
import { describe, expect, it } from "vitest";
import { CouponModel } from "../models/Coupon";
import { OrderModel } from "../models/Order";
import { ProductModel } from "../models/Product";
import { SettingsModel } from "../models/Settings";
import { computeOrderTotals, couponDiscount } from "../services/orderPricing";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

const year = new Date().getUTCFullYear();

async function setSettings(deliveryFees: {
  insideValley: number;
  outsideValley: number;
  freeDeliveryThreshold?: number;
}) {
  await SettingsModel.create({ ...DEFAULT_SETTINGS, key: "main", deliveryFees });
}

describe("order pricing (server-side)", () => {
  it("ignores every client-sent price and recomputes from the database", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const variant = book.variants[1]!; // NPR 2500

    const res = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [
          {
            productId: book.id,
            variantId: variant.id,
            quantity: 2,
            unitPrice: 1,
            price: 1,
            lineTotal: 1,
          },
        ],
        subtotal: 1,
        deliveryFee: 0,
        discount: 9999,
        total: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      subtotal: 5000,
      deliveryFee: 100,
      discount: 0,
      total: 5100,
      status: "pending_payment",
    });
    expect(res.body.data.items[0]).toMatchObject({
      title: "Classic Photo Book",
      variantLabel: "A4, Hardcover, 40 pages",
      unitPrice: 2500,
      quantity: 2,
      lineTotal: 5000,
    });
  });

  it("uses basePrice for products without variants and sums several lines", async () => {
    const app = testApp();
    const { book, magnet } = await createCatalog();
    const res = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [
          { productId: magnet.id, quantity: 4 },
          { productId: book.id, variantId: book.variants[0]!.id, quantity: 1 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(4 * 250 + 1500);
  });

  it("charges delivery by area and waives it above the free-delivery threshold", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    await setSettings({ insideValley: 100, outsideValley: 300, freeDeliveryThreshold: 2000 });

    const place = (area: "inside_valley" | "outside_valley", quantity: number) =>
      anon(app)
        .post("/orders")
        .send({ customer: customer(area), items: [{ productId: magnet.id, quantity }] });

    expect((await place("inside_valley", 1)).body.data.deliveryFee).toBe(100);
    expect((await place("outside_valley", 1)).body.data.deliveryFee).toBe(300);
    const free = await place("outside_valley", 8); // 8 x 250 = 2000
    expect(free.body.data.deliveryFee).toBe(0);
    expect(free.body.data.total).toBe(2000);
  });

  it("rejects unknown, inactive and mis-varianted items", async () => {
    const app = testApp();
    const { book, magnet } = await createCatalog();
    await ProductModel.updateOne({ _id: magnet._id }, { isActive: false });
    const post = (items: unknown[]) =>
      anon(app).post("/orders").send({ customer: customer(), items });

    expect((await post([{ productId: magnet.id, quantity: 1 }])).status).toBe(400); // inactive
    expect((await post([{ productId: "a".repeat(24), quantity: 1 }])).status).toBe(400); // unknown
    expect((await post([{ productId: book.id, quantity: 1 }])).status).toBe(400); // variant required
    expect(
      (await post([{ productId: book.id, variantId: "b".repeat(24), quantity: 1 }])).status,
    ).toBe(400);
    expect(
      (await post([{ productId: book.id, variantId: book.variants[0]!.id, quantity: 0 }])).status,
    ).toBe(400);
    expect(await OrderModel.countDocuments()).toBe(0);
  });

  it("applies percent and fixed coupons, capped at the subtotal", () => {
    const base = { code: "X", usedCount: 0, isActive: true } as const;
    expect(couponDiscount({ ...base, type: "percent", value: 10 }, 1999)).toBe(199);
    expect(couponDiscount({ ...base, type: "fixed", value: 300 }, 1000)).toBe(300);
    expect(couponDiscount({ ...base, type: "fixed", value: 5000 }, 1000)).toBe(1000);
  });

  it("rejects expired, inactive, exhausted and under-minimum coupons", () => {
    const base = { code: "X", type: "fixed", value: 100, usedCount: 0, isActive: true } as const;
    const now = new Date("2026-06-01");
    expect(() => couponDiscount({ ...base, expiresAt: new Date("2026-01-01") }, 1000, now)).toThrow(
      /expired/,
    );
    expect(() => couponDiscount({ ...base, isActive: false }, 1000, now)).toThrow(/not active/);
    expect(() => couponDiscount({ ...base, usageLimit: 1, usedCount: 1 }, 1000, now)).toThrow(
      /limit/,
    );
    expect(() => couponDiscount({ ...base, minOrderAmount: 5000 }, 1000, now)).toThrow(/minimum/);
  });

  it("computeOrderTotals is pure and matches the API arithmetic", () => {
    const products = new Map([
      ["p1", { id: "p1", title: "Frame", basePrice: 700, isActive: true, variants: [] }],
    ]);
    const totals = computeOrderTotals(
      { customer: customer("outside_valley"), items: [{ productId: "p1", quantity: 3 }] },
      products,
      { ...DEFAULT_SETTINGS, deliveryFees: { insideValley: 100, outsideValley: 250 } },
      { code: "TEN", type: "percent", value: 10, usedCount: 0, isActive: true },
    );
    expect(totals).toMatchObject({ subtotal: 2100, discount: 210, deliveryFee: 250, total: 2140 });
  });

  it("orders with a coupon store the discount and consume one use", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    await CouponModel.create({ code: "WELCOME10", type: "percent", value: 10, usageLimit: 1 });

    const order = {
      customer: customer(),
      items: [{ productId: magnet.id, quantity: 4 }],
      couponCode: "welcome10",
    };
    const first = await anon(app).post("/orders").send(order);
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      subtotal: 1000,
      discount: 100,
      couponCode: "WELCOME10",
      total: 1000,
    });
    expect((await CouponModel.findOne({ code: "WELCOME10" }))?.usedCount).toBe(1);

    const second = await anon(app).post("/orders").send(order);
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/limit/);
    expect(await OrderModel.countDocuments()).toBe(1);
  });

  it("rejects an unknown coupon code", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const res = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [{ productId: magnet.id, quantity: 1 }],
        couponCode: "NOPE",
      });
    expect(res.status).toBe(400);
  });

  it("POST /coupons/validate previews a discount without consuming it", async () => {
    const app = testApp();
    await CouponModel.create({ code: "FIXED200", type: "fixed", value: 200 });
    const res = await anon(app)
      .post("/coupons/validate")
      .send({ code: "fixed200", subtotal: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ code: "FIXED200", discount: 200 });
    expect((await CouponModel.findOne({ code: "FIXED200" }))?.usedCount).toBe(0);
  });
});

describe("order codes", () => {
  it("generates MOM-YYYY-#### sequentially", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const place = () =>
      anon(app)
        .post("/orders")
        .send({ customer: customer(), items: [{ productId: magnet.id, quantity: 1 }] });

    expect((await place()).body.data.code).toBe(`MOM-${year}-0001`);
    expect((await place()).body.data.code).toBe(`MOM-${year}-0002`);
  });

  it("never issues the same code to concurrent orders", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        anon(app)
          .post("/orders")
          .send({ customer: customer(), items: [{ productId: magnet.id, quantity: 1 }] }),
      ),
    );
    expect(responses.every((r) => r.status === 201)).toBe(true);
    const codes = responses.map((r) => r.body.data.code as string);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) expect(code).toMatch(new RegExp(`^MOM-${year}-\\d{4}$`));
  });
});

describe("order status transitions", () => {
  async function newOrder(app: ReturnType<typeof testApp>) {
    const { magnet } = await createCatalog();
    const res = await anon(app)
      .post("/orders")
      .send({ customer: customer(), items: [{ productId: magnet.id, quantity: 1 }] });
    return res.body.data.id as string;
  }

  it("walks pending_payment > paid > printing > shipped > delivered and records history", async () => {
    const app = testApp();
    const id = await newOrder(app);
    const staff = await loginAs(app, "staff");

    for (const status of ["paid", "printing", "shipped", "delivered"]) {
      const res = await staff.patch(`/orders/${id}/status`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
    const order = await staff.get(`/orders/${id}`);
    expect(order.body.data.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      "pending_payment",
      "paid",
      "printing",
      "shipped",
      "delivered",
    ]);
  });

  it("blocks skipped, backward and post-final transitions with 409", async () => {
    const app = testApp();
    const id = await newOrder(app);
    const staff = await loginAs(app, "staff");
    const move = (status: string) => staff.patch(`/orders/${id}/status`).send({ status });

    expect((await move("shipped")).status).toBe(409); // skips paid and printing
    expect((await move("pending_payment")).status).toBe(409); // same status
    expect((await move("paid")).status).toBe(200);
    expect((await move("pending_payment")).status).toBe(409); // backwards
    expect((await move("cancelled")).status).toBe(200);
    expect((await move("paid")).status).toBe(409); // cancelled is final
    expect((await move("bogus")).status).toBe(400);
    expect((await OrderModel.findById(id))?.status).toBe("cancelled");
  });

  it("cannot cancel after shipping", async () => {
    const app = testApp();
    const id = await newOrder(app);
    const staff = await loginAs(app, "staff");
    for (const status of ["paid", "printing", "shipped"])
      await staff.patch(`/orders/${id}/status`).send({ status });
    expect((await staff.patch(`/orders/${id}/status`).send({ status: "cancelled" })).status).toBe(
      409,
    );
  });

  it("cancelling releases the coupon use", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    await CouponModel.create({ code: "ONCE", type: "fixed", value: 50, usageLimit: 1 });
    const res = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [{ productId: magnet.id, quantity: 1 }],
        couponCode: "ONCE",
      });
    const staff = await loginAs(app, "staff");
    await staff.patch(`/orders/${res.body.data.id}/status`).send({ status: "cancelled" });
    expect((await CouponModel.findOne({ code: "ONCE" }))?.usedCount).toBe(0);
  });

  it("requires a staff or admin session", async () => {
    const app = testApp();
    const id = await newOrder(app);
    expect((await anon(app).patch(`/orders/${id}/status`).send({ status: "paid" })).status).toBe(
      401,
    );
    expect((await anon(app).get("/orders")).status).toBe(401);
    expect((await anon(app).get(`/orders/${id}`)).status).toBe(401);
  });
});

describe("order privacy", () => {
  it("lists orders with pagination for staff", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    for (let i = 0; i < 3; i += 1) {
      await anon(app)
        .post("/orders")
        .send({ customer: customer(), items: [{ productId: magnet.id, quantity: 1 }] });
    }
    const staff = await loginAs(app, "staff");
    const res = await staff.get("/orders?limit=2&page=2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it("tracking needs the matching code and phone, and hides the address", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const created = await anon(app)
      .post("/orders")
      .send({ customer: customer(), items: [{ productId: magnet.id, quantity: 1 }] });
    const code = created.body.data.code as string;

    const ok = await anon(app).post("/orders/track").send({ code, phone: "+977 98-1234 5678" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("pending_payment");
    expect(JSON.stringify(ok.body)).not.toMatch(/Baneshwor|9812345678|Sita/);

    expect((await anon(app).post("/orders/track").send({ code, phone: "9800000000" })).status).toBe(
      404,
    );
    expect(
      (await anon(app).post("/orders/track").send({ code: "MOM-2000-9999", phone: "9812345678" }))
        .status,
    ).toBe(404);
  });
});

describe("order photos", () => {
  const photo = "https://res.cloudinary.com/demo-cloud/image/upload/v1/momento/orders/abc.jpg";

  it("stores customer photos on the order but never returns them from tracking", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const res = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [{ productId: magnet.id, quantity: 1 }],
        photos: [photo],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.photos).toEqual([photo]);

    const tracked = await anon(app)
      .post("/orders/track")
      .send({ code: res.body.data.code, phone: "9812345678" });
    expect(JSON.stringify(tracked.body)).not.toContain("abc.jpg");
  });

  it("rejects photos hosted anywhere but our orders folder, and more than 30", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const base = { customer: customer(), items: [{ productId: magnet.id, quantity: 1 }] };
    for (const bad of [
      "https://evil.example/x.jpg",
      "https://res.cloudinary.com/demo-cloud/image/upload/v1/momento/products/x.jpg",
    ]) {
      expect(
        (
          await anon(app)
            .post("/orders")
            .send({ ...base, photos: [bad] })
        ).status,
      ).toBe(400);
    }
    const many = Array.from({ length: 31 }, () => photo);
    expect(
      (
        await anon(app)
          .post("/orders")
          .send({ ...base, photos: many })
      ).status,
    ).toBe(400);
  });
});
