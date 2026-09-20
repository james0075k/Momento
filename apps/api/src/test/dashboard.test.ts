import { describe, expect, it } from "vitest";
import { OrderModel, ReviewModel } from "../models";
import { buildDashboard, nepalMonthRange } from "../services/dashboard";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

let number = 0;
async function makeOrder(spec: {
  createdAt: Date;
  status?: string;
  total?: number;
  title?: string;
  quantity?: number;
  paidAt?: Date;
}) {
  number += 1;
  const { magnet } = await createCatalog().catch(async () => ({
    magnet: (await OrderModel.db.model("Product").findOne())!,
  }));
  const history = [{ status: "pending_payment", at: spec.createdAt }];
  if (spec.paidAt) history.push({ status: "paid", at: spec.paidAt });
  const order = await OrderModel.create({
    code: `MOM-2026-${String(number).padStart(4, "0")}`,
    customer: { ...customer(), address: "Baneshwor" },
    items: [
      {
        productId: magnet._id,
        title: spec.title ?? "Photo Magnet",
        unitPrice: 250,
        quantity: spec.quantity ?? 1,
        lineTotal: 250 * (spec.quantity ?? 1),
      },
    ],
    subtotal: 250,
    deliveryFee: 100,
    discount: 0,
    total: spec.total ?? 350,
    status: spec.status ?? "pending_payment",
    paymentMethod: "whatsapp",
    statusHistory: history,
  });
  await OrderModel.collection.updateOne(
    { _id: order._id },
    { $set: { createdAt: spec.createdAt } },
  );
  return order;
}

describe("Nepal months", () => {
  it("runs from the 1st at Nepal midnight to the 1st of the next month, across the year end", () => {
    const sep = nepalMonthRange("2026-09-19");
    expect(sep.month).toBe("2026-09");
    expect(sep.start.toISOString()).toBe("2026-08-31T18:15:00.000Z");
    expect(sep.end.toISOString()).toBe("2026-09-30T18:15:00.000Z");
    const dec = nepalMonthRange("2026-12-31");
    expect(dec.end.toISOString()).toBe("2026-12-31T18:15:00.000Z");
  });
});

describe("dashboard numbers", () => {
  const now = new Date("2026-09-19T14:00:00Z"); // 19:45 on the 19th in Nepal
  const hoursAgo = (n: number) => new Date(now.getTime() - n * 3_600_000);

  it("counts today and this month separately, and leaves cancelled orders out", async () => {
    await createCatalog();
    // Today, paid today.
    await makeOrder({ createdAt: hoursAgo(3), status: "paid", total: 600, paidAt: hoursAgo(2) });
    // Today, still unpaid.
    await makeOrder({ createdAt: hoursAgo(1) });
    // Today, cancelled: not counted.
    await makeOrder({ createdAt: hoursAgo(1), status: "cancelled" });
    // Earlier this month, paid earlier.
    await makeOrder({
      createdAt: new Date("2026-09-05T06:00:00Z"),
      status: "delivered",
      total: 1000,
      paidAt: new Date("2026-09-05T08:00:00Z"),
    });
    // Last month: outside both periods.
    await makeOrder({
      createdAt: new Date("2026-08-20T06:00:00Z"),
      status: "paid",
      total: 9999,
      paidAt: new Date("2026-08-20T08:00:00Z"),
    });

    const d = await buildDashboard(now);
    expect(d.today).toMatchObject({ day: "2026-09-19", orders: 2, paidOrders: 1, revenue: 600 });
    expect(d.month).toMatchObject({ month: "2026-09", orders: 3, paidOrders: 2, revenue: 1600 });
    expect(d.pendingPayments).toEqual({ count: 1, amount: 350 });
    expect(d.ordersByStatus).toEqual({
      pending_payment: 1,
      paid: 1,
      printing: 0,
      shipped: 0,
      delivered: 1,
      cancelled: 1,
    });
    expect(d.topProducts).toEqual([{ title: "Photo Magnet", quantity: 3 }]);
  });

  it("lists reviews awaiting approval, newest first, with a short comment", async () => {
    const { magnet } = await createCatalog();
    await ReviewModel.create({
      productId: magnet._id,
      name: "A",
      rating: 5,
      comment: "x".repeat(300),
    });
    await ReviewModel.create({
      productId: magnet._id,
      name: "B",
      rating: 4,
      comment: "fine",
      status: "approved",
    });
    const d = await buildDashboard(now);
    expect(d.reviewsAwaitingApproval.count).toBe(1);
    expect(d.reviewsAwaitingApproval.latest[0]).toMatchObject({ name: "A", rating: 5 });
    expect(d.reviewsAwaitingApproval.latest[0]?.comment).toHaveLength(200);
  });

  it("is an empty dashboard, not an error, for a new shop", async () => {
    const d = await buildDashboard(now);
    expect(d.today).toMatchObject({ orders: 0, paidOrders: 0, revenue: 0 });
    expect(d.topProducts).toEqual([]);
    expect(d.pendingPayments).toEqual({ count: 0, amount: 0 });
  });
});

describe("GET /stats/dashboard", () => {
  it("needs a signed-in staff member or admin", async () => {
    const app = testApp();
    expect((await anon(app).get("/stats/dashboard")).status).toBe(401);
    const staff = await loginAs(app, "staff");
    const res = await staff.get("/stats/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data.today.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/Baneshwor|phone/);
  });
});
