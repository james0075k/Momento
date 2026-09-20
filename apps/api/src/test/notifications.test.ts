import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env";
import { AuditLogModel, OrderModel, ReviewModel } from "../models";
import { CSV_BOM, csvCell, csvRow } from "../services/csv";
import { buildDailySummary, nepalDay, nepalDayRange } from "../services/summary";
import {
  customerReplyLink,
  phoneForWhatsapp,
  reviewRequestLink,
  teamShareLink,
} from "../services/whatsappLinks";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

const SETTINGS = {
  shopWhatsappNumber: "9779801234567",
  deliveryFees: { insideValley: 100, outsideValley: 250 },
  socialLinks: {},
  paymentDetails: {},
  seo: {},
};

type App = ReturnType<typeof testApp>;

async function setFeatures(
  admin: Awaited<ReturnType<typeof loginAs>>,
  features: Record<string, boolean>,
) {
  await admin.put("/settings").send({ ...SETTINGS, features });
}

async function setup(features: Record<string, boolean>) {
  const app = testApp();
  const admin = await loginAs(app, "admin");
  await admin.put("/settings").send({ ...SETTINGS, features });
  const staff = await loginAs(app, "staff");
  return { app, admin, staff };
}

let orderNumber = 0;
interface OrderSpec {
  status?: string;
  name?: string;
  phone?: string;
  createdAt?: Date;
  total?: number;
  history?: Array<{ status: string; at: Date }>;
  quantity?: number;
  reviewRequestSentAt?: Date;
}
/** An order with dates we choose, written straight to the database. */
async function makeOrder(spec: OrderSpec = {}) {
  orderNumber += 1;
  const { magnet } = await ensureMagnet();
  const created = spec.createdAt ?? new Date();
  const order = await OrderModel.create({
    code: `MOM-2026-${String(orderNumber).padStart(4, "0")}`,
    customer: {
      ...customer(),
      name: spec.name ?? "Sita Sharma",
      phone: spec.phone ?? "9812345678",
      address: "Baneshwor, Kathmandu",
    },
    items: [
      {
        productId: magnet._id,
        title: "Photo Magnet",
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
    statusHistory: spec.history ?? [{ status: "pending_payment", at: created }],
    reviewRequestSentAt: spec.reviewRequestSentAt,
  });
  await OrderModel.collection.updateOne({ _id: order._id }, { $set: { createdAt: created } });
  return order;
}

let catalog: Awaited<ReturnType<typeof createCatalog>> | undefined;
async function ensureMagnet() {
  catalog ??= await createCatalog();
  return catalog;
}
afterEach(() => {
  catalog = undefined;
  vi.unstubAllGlobals();
  for (const key of [
    "RESEND_API_KEY",
    "SUMMARY_TO_EMAIL",
    "SUMMARY_FROM_EMAIL",
    "CRON_SECRET",
    "SITE_URL",
  ] as const) {
    delete env[key];
  }
});

describe("WhatsApp links", () => {
  it("adds 977 to a 10-digit Nepali number and keeps a full international one", () => {
    expect(phoneForWhatsapp("98-1234 5678")).toBe("9779812345678");
    expect(phoneForWhatsapp("+977 9812345678")).toBe("9779812345678");
  });

  it("builds a customer reply that fits the status, addressed to the customer", () => {
    const link = customerReplyLink({
      code: "MOM-2026-0001",
      status: "shipped",
      total: 350,
      customer: { name: "Sita Sharma", phone: "9812345678" },
    });
    expect(link).toMatch(/^https:\/\/wa\.me\/9779812345678\?text=/);
    const text = decodeURIComponent(link!.split("?text=")[1]!);
    expect(text).toContain("Hi Sita");
    expect(text).toContain("MOM-2026-0001");
    expect(text).toContain("on its way");
  });

  it("has no reply link without a phone", () => {
    expect(
      customerReplyLink({ code: "X", status: "paid", total: 1, customer: null }),
    ).toBeUndefined();
  });

  it("builds a team share with the order but no phone number and no address", () => {
    const link = teamShareLink({
      code: "MOM-2026-0002",
      status: "paid",
      total: 900,
      customer: { name: "Sita Sharma", phone: "9812345678", area: "inside_valley" },
      items: [{ title: "Photo Book", variantLabel: "A5", quantity: 2 }],
    });
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(link.split("?text=")[1]!);
    expect(text).toContain("2 x Photo Book (A5)");
    expect(text).toContain("inside Kathmandu Valley");
    expect(text).toContain("NPR 900");
    expect(text).not.toMatch(/9812345678|Sita|Baneshwor/);
  });

  it("asks for a review, with the site link only when SITE_URL is set", () => {
    const order = {
      code: "M",
      status: "delivered",
      total: 1,
      customer: { name: "Sita", phone: "9812345678" },
    };
    expect(decodeURIComponent(reviewRequestLink(order)!)).not.toContain("http://shop");
    env.SITE_URL = "https://momento.example";
    expect(decodeURIComponent(reviewRequestLink(order)!)).toContain("https://momento.example/shop");
  });
});

describe("CSV cells", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("neutralises spreadsheet formulas but leaves numbers, dates and phone numbers alone", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+cmd|' /C calc'!A0")).toContain("'+cmd");
    expect(csvCell("@SUM(1)")).toBe("'@SUM(1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("+977 98-1234 5678", { phone: true })).toBe("+977 98-1234 5678");
    expect(csvCell("+977 98-1234 5678")).toBe("'+977 98-1234 5678");
    expect(csvCell("+1+cmd", { phone: true })).toBe("'+1+cmd");
    expect(csvCell(new Date("2026-09-19T00:00:00Z"))).toBe("2026-09-19T00:00:00.000Z");
    expect(csvCell(null)).toBe("");
  });

  it("ends every row with CRLF and starts a file with the BOM constant", () => {
    expect(csvRow(["a", 1])).toBe("a,1\r\n");
    expect(CSV_BOM).toBe("﻿");
  });
});

describe("Nepal days", () => {
  it("switches day at 18:15 UTC (midnight, UTC+05:45)", () => {
    expect(nepalDay(new Date("2026-09-19T18:14:59Z"))).toBe("2026-09-19");
    expect(nepalDay(new Date("2026-09-19T18:15:00Z"))).toBe("2026-09-20");
    const { start, end } = nepalDayRange("2026-09-20");
    expect(start.toISOString()).toBe("2026-09-19T18:15:00.000Z");
    expect(end.toISOString()).toBe("2026-09-20T18:15:00.000Z");
  });
});

describe("daily summary", () => {
  const now = new Date("2026-09-19T14:00:00Z"); // 19:45 in Nepal, still the 19th
  const day = "2026-09-19";
  const hours = (n: number) => new Date(now.getTime() - n * 3_600_000);

  it("counts only that Nepal day, and keeps cancelled orders out of revenue and top products", async () => {
    await ensureMagnet();
    await makeOrder({
      status: "paid",
      createdAt: hours(3),
      quantity: 2,
      total: 600,
      history: [
        { status: "pending_payment", at: hours(3) },
        { status: "paid", at: hours(2) },
      ],
    });
    await makeOrder({ status: "cancelled", createdAt: hours(3), quantity: 9 });
    // Just before the day started in Nepal (18:14 UTC the day before).
    await makeOrder({ createdAt: new Date("2026-09-18T18:14:00Z") });
    await ReviewModel.create({
      productId: catalog!.magnet._id,
      name: "A",
      rating: 5,
      comment: "ok",
    });

    const { summary } = await buildDailySummary({ day, now });
    expect(summary.newOrders).toBe(2);
    expect(summary.byStatus).toEqual({ paid: 1, cancelled: 1 });
    expect(summary.paid).toEqual({ count: 1, amount: 600 });
    expect(summary.topProducts).toEqual([{ title: "Photo Magnet", quantity: 2 }]);
    expect(summary.reviewsAwaitingApproval).toBe(1);
  });

  it("lists unpaid orders older than a day with a reply link, and delivered ones due a review request", async () => {
    await ensureMagnet();
    await makeOrder({ createdAt: hours(30), name: "Late Payer" });
    await makeOrder({ createdAt: hours(3), name: "Fresh" }); // under a day: not listed
    await makeOrder({
      status: "delivered",
      name: "Happy Buyer",
      createdAt: hours(80),
      history: [{ status: "delivered", at: hours(20) }],
    });
    await makeOrder({
      status: "delivered",
      name: "Long Ago",
      createdAt: hours(300),
      history: [{ status: "delivered", at: hours(200) }],
    });
    await makeOrder({
      status: "delivered",
      name: "Already Asked",
      createdAt: hours(80),
      history: [{ status: "delivered", at: hours(20) }],
      reviewRequestSentAt: hours(1),
    });

    const { summary, reviewRequestOrderIds } = await buildDailySummary({ day, now });
    expect(summary.pendingPayments.map((o) => o.name)).toEqual(["Late Payer"]);
    expect(summary.pendingPayments[0]).toMatchObject({ hoursOld: 30 });
    expect(summary.pendingPayments[0]?.replyLink).toMatch(/^https:\/\/wa\.me\/9779812345678/);
    expect(summary.reviewRequests.map((o) => o.name)).toEqual(["Happy Buyer"]);
    expect(reviewRequestOrderIds).toHaveLength(1);
  });
});

describe("GET /summary/daily and /orders/:id/whatsapp", () => {
  it("answer 404 while their flags are off", async () => {
    const { app, staff } = await setup({});
    const order = await makeOrder();
    expect((await staff.get("/summary/daily")).status).toBe(404);
    expect((await staff.get(`/orders/${order.id}/whatsapp`)).status).toBe(404);
    expect((await anon(app).get("/summary/daily")).status).toBe(404);
  });

  it("need a signed-in staff member, and validate the day", async () => {
    const { app, staff } = await setup({ dailySummary: true, orderAlerts: true });
    const order = await makeOrder();
    expect((await anon(app).get("/summary/daily")).status).toBe(401);
    expect((await anon(app).get(`/orders/${order.id}/whatsapp`)).status).toBe(401);
    expect((await staff.get("/summary/daily?day=2026-02-31")).status).toBe(400);
    expect((await staff.get("/summary/daily?day=nope")).status).toBe(400);

    const summary = await staff.get("/summary/daily?day=2026-09-19");
    expect(summary.status).toBe(200);
    expect(summary.body.data.day).toBe("2026-09-19");

    const links = await staff.get(`/orders/${order.id}/whatsapp`);
    expect(links.status).toBe(200);
    expect(links.body.data.customerReply).toMatch(/^https:\/\/wa\.me\/9779812345678\?text=/);
    expect(links.body.data.teamShare).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(JSON.stringify(links.body)).not.toMatch(/Baneshwor/);
    expect((await staff.get(`/orders/${"0".repeat(24)}/whatsapp`)).status).toBe(404);
  });
});

describe("POST /internal/daily-summary", () => {
  const configure = () => {
    env.CRON_SECRET = "a-long-cron-secret-value";
    env.RESEND_API_KEY = "re_test_key";
    env.SUMMARY_FROM_EMAIL = "reports@momento.example";
    env.SUMMARY_TO_EMAIL = "owner@example.com, partner@example.com";
  };
  const call = (
    app: App,
    secret: string | null = "a-long-cron-secret-value",
    body: object = {},
  ) => {
    const req = anon(app).post("/internal/daily-summary");
    return (secret === null ? req : req.set("x-cron-secret", secret)).send(body);
  };
  const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200 });

  it("looks like an unknown route without the flag, the secret or a configured secret", async () => {
    const { app, admin } = await setup({});
    configure();
    expect((await call(app)).status).toBe(404); // flag off

    await setFeatures(admin, { dailySummary: true });
    expect((await call(app, null)).status).toBe(404);
    expect((await call(app, "wrong-secret-value-here")).status).toBe(404);
    delete env.CRON_SECRET;
    expect((await call(app)).status).toBe(404);
  });

  it("previews with dryRun: nothing is sent or marked", async () => {
    const { app } = await setup({ dailySummary: true });
    configure();
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(app, undefined, { dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 when email is not configured", async () => {
    const { app } = await setup({ dailySummary: true });
    configure();
    delete env.RESEND_API_KEY;
    const res = await call(app);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/);
  });

  it("sends through Resend, escapes customer text, leaves out addresses, and marks review requests once", async () => {
    const { app } = await setup({ dailySummary: true });
    configure();
    const now = Date.now();
    await makeOrder({
      createdAt: new Date(now - 30 * 3_600_000),
      name: "<script>alert(1)</script> Evil",
    });
    const delivered = await makeOrder({
      status: "delivered",
      name: "Happy Buyer",
      createdAt: new Date(now - 60 * 3_600_000),
      history: [{ status: "delivered", at: new Date(now - 10 * 3_600_000) }],
    });
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const res = await call(app);
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer re_test_key");
    const sent = JSON.parse(init.body as string) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    };
    expect(sent.from).toBe("reports@momento.example");
    expect(sent.to).toEqual(["owner@example.com", "partner@example.com"]);
    expect(sent.subject).toMatch(/^Momento daily summary, \d{4}-\d{2}-\d{2}/);
    expect(sent.html).not.toContain("<script>");
    expect(sent.html).toContain("&lt;script&gt;");
    expect(sent.html + sent.text).not.toMatch(/Baneshwor/);
    expect(sent.html).toContain("https://wa.me/9779812345678");

    expect((await OrderModel.findById(delivered._id))?.reviewRequestSentAt).toBeInstanceOf(Date);
    // A second email does not ask again.
    const again = await call(app);
    expect(again.body.data.summary.reviewRequests).toEqual([]);
  });

  it("answers 502 and marks nothing when Resend refuses or cannot be reached", async () => {
    const { app } = await setup({ dailySummary: true });
    configure();
    const delivered = await makeOrder({
      status: "delivered",
      createdAt: new Date(Date.now() - 60 * 3_600_000),
      history: [{ status: "delivered", at: new Date(Date.now() - 10 * 3_600_000) }],
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const refused = await call(app);
    expect(refused.status).toBe(502);
    expect(JSON.stringify(refused.body)).not.toContain("re_test_key");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect((await call(app)).status).toBe(502);
    expect((await OrderModel.findById(delivered._id))?.reviewRequestSentAt).toBeUndefined();
  });
});

describe("CSV exports", () => {
  it("answer 404 while the flag is off, and refuse everyone but admins", async () => {
    const { app, admin, staff } = await setup({});
    expect((await admin.get("/orders/export.csv")).status).toBe(404);
    expect((await admin.get("/customers/export.csv")).status).toBe(404);

    await setFeatures(admin, { csvExport: true });
    expect((await anon(app).get("/orders/export.csv")).status).toBe(401);
    expect((await staff.get("/orders/export.csv")).status).toBe(403);
    expect((await staff.get("/customers/export.csv")).status).toBe(403);
  });

  it("downloads orders as a safe CSV without addresses, and writes the audit log", async () => {
    const { admin } = await setup({ csvExport: true });
    await makeOrder({ name: '=HYPERLINK("http://evil","x")', phone: "+977 98-1234 5678" });
    await makeOrder({ name: 'Sita, "Sita" Sharma', status: "cancelled", total: 999 });

    const res = await admin.get("/orders/export.csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(
      /^attachment; filename="momento-orders-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    const text = res.text;
    expect(text.startsWith(CSV_BOM)).toBe(true);
    const lines = text.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe(
      "Order code,Created (UTC),Status,Customer,Phone,Area,Items,Items total (NPR),Delivery (NPR),Coupon discount (NPR),Coupon,Referral discount (NPR),Gift card (NPR),Total (NPR),Payment method",
    );
    expect(lines).toHaveLength(3);
    expect(text).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(text).toContain("+977 98-1234 5678");
    expect(text).toContain('"Sita, ""Sita"" Sharma"');
    expect(text).toContain("1 x Photo Magnet");
    expect(text).not.toMatch(/Baneshwor/);

    // The download itself is written to the audit log (path only, no query values).
    await vi.waitFor(async () => {
      expect(await AuditLogModel.countDocuments({ path: "/orders/export.csv" })).toBe(1);
    });
  });

  it("filters by status and by Nepal day", async () => {
    const { admin } = await setup({ csvExport: true });
    await makeOrder({ createdAt: new Date("2026-09-10T06:00:00Z"), status: "paid" });
    await makeOrder({ createdAt: new Date("2026-09-15T06:00:00Z") });
    const body = async (query: string) =>
      (await admin.get(`/orders/export.csv${query}`)).text.trimEnd().split("\r\n").length - 1;
    expect(await body("")).toBe(2);
    expect(await body("?status=paid")).toBe(1);
    expect(await body("?from=2026-09-12")).toBe(1);
    expect(await body("?to=2026-09-12")).toBe(1);
    expect(await body("?from=2026-09-11&to=2026-09-12")).toBe(0);
    expect((await admin.get("/orders/export.csv?from=bad")).status).toBe(400);
  });

  it("groups customers by phone whatever its formatting, and leaves cancelled orders out of spend", async () => {
    const { admin } = await setup({ csvExport: true });
    await makeOrder({ phone: "9812345678", name: "Sita", total: 350 });
    await makeOrder({ phone: "+977 98-1234 5678", name: "Sita Sharma", total: 500 });
    await makeOrder({ phone: "9812345678", status: "cancelled", total: 9999 });
    await makeOrder({ phone: "9800000009", name: "Ram", total: 100 });

    const res = await admin.get("/customers/export.csv");
    expect(res.status).toBe(200);
    const lines = res.text.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    const sita = lines.find((line) => line.includes("9812345678") || line.includes("98-1234"));
    expect(sita).toBeDefined();
    expect(sita).toMatch(/,3,850,/);
    expect(res.text).not.toMatch(/Baneshwor/);
  });
});

describe("POST /orders/track", () => {
  it("returns product and variant ids so a repeat order can be built, and still no address", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const variant = book.variants[0]!;
    const created = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [{ productId: book.id, variantId: variant.id, quantity: 2 }],
      });
    expect(created.status).toBe(201);
    const tracked = await anon(app)
      .post("/orders/track")
      .send({ code: created.body.data.code, phone: "9812345678" });
    expect(tracked.body.data.items[0]).toMatchObject({
      productId: book.id,
      variantId: variant.id,
      quantity: 2,
    });
    expect(JSON.stringify(tracked.body)).not.toMatch(/Baneshwor|Sita/);
  });
});
