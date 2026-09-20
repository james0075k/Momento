import type { Express } from "express";
import { describe, expect, it } from "vitest";
import { OrderModel } from "../models/Order";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

async function placeOrder(
  app: Express,
  productId: string,
  who: { name: string; phone: string } = customer(),
) {
  const res = await anon(app)
    .post("/orders")
    .send({
      customer: { ...customer(), ...who },
      items: [{ productId, quantity: 1 }],
      paymentMethod: "whatsapp",
    });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; code: string; total: number };
}

describe("order notes", () => {
  it("staff can save and clear notes without touching the status or its history", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const order = await placeOrder(app, magnet.id);
    const staff = await loginAs(app, "staff");

    const saved = await staff
      .patch(`/orders/${order.id}/notes`)
      .send({ adminNotes: "  Call first " });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ adminNotes: "Call first", status: "pending_payment" });
    expect(saved.body.data.statusHistory).toHaveLength(1);

    const cleared = await staff.patch(`/orders/${order.id}/notes`).send({ adminNotes: "" });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.adminNotes).toBeUndefined();
  });

  it("refuses anonymous callers, long notes and unknown orders", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const order = await placeOrder(app, magnet.id);
    expect(
      (await anon(app).patch(`/orders/${order.id}/notes`).send({ adminNotes: "x" })).status,
    ).toBe(401);

    const staff = await loginAs(app, "staff");
    const long = await staff
      .patch(`/orders/${order.id}/notes`)
      .send({ adminNotes: "x".repeat(1001) });
    expect(long.status).toBe(400);
    const missing = await staff
      .patch("/orders/aaaaaaaaaaaaaaaaaaaaaaaa/notes")
      .send({ adminNotes: "x" });
    expect(missing.status).toBe(404);
  });

  it("never shows the notes to a customer tracking the order", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const order = await placeOrder(app, magnet.id);
    await OrderModel.updateOne({ _id: order.id }, { $set: { adminNotes: "internal" } });
    const tracked = await anon(app)
      .post("/orders/track")
      .send({ code: order.code, phone: customer().phone });
    expect(tracked.status).toBe(200);
    expect(JSON.stringify(tracked.body)).not.toContain("internal");
  });
});

describe("review replies", () => {
  const submit = async (app: Express, productId: string) =>
    (
      await anon(app)
        .post("/reviews")
        .send({ productId, name: "Anita", rating: 5, comment: "Beautiful album." })
    ).body.data.id as string;

  it("staff reply shows publicly only once the review is approved, and can be removed", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const id = await submit(app, book.id);
    const staff = await loginAs(app, "staff");

    const replied = await staff
      .patch(`/reviews/${id}/reply`)
      .send({ reply: " Thank you, Anita! " });
    expect(replied.status).toBe(200);
    expect(replied.body.data.reply).toBe("Thank you, Anita!");
    expect(replied.body.data.repliedAt).toBeTruthy();
    expect((await anon(app).get("/reviews")).body.data).toHaveLength(0);

    await staff.patch(`/reviews/${id}/status`).send({ status: "approved" });
    const shown = await anon(app).get("/reviews");
    expect(shown.body.data[0]).toMatchObject({ reply: "Thank you, Anita!" });

    const removed = await staff.patch(`/reviews/${id}/reply`).send({ reply: "" });
    expect(removed.status).toBe(200);
    expect(removed.body.data.reply).toBeUndefined();
    expect(removed.body.data.repliedAt).toBeUndefined();
    expect((await anon(app).get("/reviews")).body.data[0].reply).toBeUndefined();
  });

  it("refuses anonymous callers, long replies and unknown reviews", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const id = await submit(app, book.id);
    expect((await anon(app).patch(`/reviews/${id}/reply`).send({ reply: "hi" })).status).toBe(401);

    const staff = await loginAs(app, "staff");
    expect(
      (await staff.patch(`/reviews/${id}/reply`).send({ reply: "x".repeat(1001) })).status,
    ).toBe(400);
    expect(
      (await staff.patch("/reviews/aaaaaaaaaaaaaaaaaaaaaaaa/reply").send({ reply: "hi" })).status,
    ).toBe(404);
  });
});

describe("customers", () => {
  it("groups orders by the last 10 digits of the phone and leaves cancelled orders out of spent", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    const first = await placeOrder(app, magnet.id, { name: "Sita", phone: "9812345678" });
    await placeOrder(app, magnet.id, { name: "Sita Sharma", phone: "+9779812345678" });
    await placeOrder(app, magnet.id, { name: "Ram", phone: "9800000000" });
    const staff = await loginAs(app, "staff");
    await staff.patch(`/orders/${first.id}/status`).send({ status: "cancelled" });

    const res = await staff.get("/customers");
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    const sita = res.body.data.find((c: { key: string }) => c.key === "9812345678");
    expect(sita).toMatchObject({ name: "Sita Sharma", phone: "+9779812345678", orders: 2 });
    expect(sita.spent).toBe(first.total);
    expect(new Date(sita.lastOrderAt).getTime()).toBeGreaterThanOrEqual(
      new Date(sita.firstOrderAt).getTime(),
    );
  });

  it("searches by name or phone and paginates", async () => {
    const app = testApp();
    const { magnet } = await createCatalog();
    await placeOrder(app, magnet.id, { name: "Sita", phone: "9812345678" });
    await placeOrder(app, magnet.id, { name: "Ram", phone: "9800000000" });
    const staff = await loginAs(app, "staff");

    const byName = await staff.get("/customers?q=ram");
    expect(byName.body.data.map((c: { name: string }) => c.name)).toEqual(["Ram"]);
    const byPhone = await staff.get("/customers?q=98123");
    expect(byPhone.body.data.map((c: { name: string }) => c.name)).toEqual(["Sita"]);
    const page = await staff.get("/customers?limit=1&page=2");
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    const regexChars = await staff.get("/customers?q=.*");
    expect(regexChars.body.data).toHaveLength(0);
  });

  it("is for signed-in staff only", async () => {
    const app = testApp();
    expect((await anon(app).get("/customers")).status).toBe(401);
  });
});
