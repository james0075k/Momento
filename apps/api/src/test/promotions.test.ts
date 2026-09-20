import { describe, expect, it } from "vitest";
import { CouponModel, GiftCardModel, ReferralModel } from "../models";
import { computeOrderTotals, type PricingProduct } from "../services/orderPricing";
import { issueReferrerReward } from "../services/promotions";
import { OrderModel } from "../models";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

const SETTINGS = {
  shopWhatsappNumber: "9779801234567",
  deliveryFees: { insideValley: 100, outsideValley: 250 },
  socialLinks: {},
  paymentDetails: {},
  seo: {},
};

type App = ReturnType<typeof testApp>;

async function enable(app: App, features: Record<string, boolean>) {
  const admin = await loginAs(app, "admin");
  await admin.put("/settings").send({ ...SETTINGS, features });
  return admin;
}

async function setup(features: Record<string, boolean>) {
  const app = testApp();
  const admin = await enable(app, features);
  const { magnet } = await createCatalog();
  const staff = await loginAs(app, "staff");
  const place = (phone: string, extra: Record<string, unknown> = {}, quantity = 1) =>
    anon(app)
      .post("/orders")
      .send({
        customer: { ...customer(), phone },
        items: [{ productId: magnet.id, quantity }],
        ...extra,
      });
  const advance = async (id: string, to: string[]) => {
    for (const status of to) {
      const res = await staff.patch(`/orders/${id}/status`).send({ status });
      expect(res.status).toBe(200);
    }
  };
  const deliver = (id: string) => advance(id, ["paid", "printing", "shipped", "delivered"]);
  const track = (code: string, phone: string) =>
    anon(app).post("/orders/track").send({ code, phone });
  return { app, admin, staff, magnet, place, advance, deliver, track };
}

const ALICE = "9812345678";
const BOB = "9800000002";

const product: PricingProduct = {
  id: "a".repeat(24),
  title: "Magnet",
  basePrice: 250,
  isActive: true,
  variants: [],
};
const totals = (
  quantity: number,
  promo: { referralDiscount?: number; giftCardBalance?: number },
  coupon?: Parameters<typeof computeOrderTotals>[3],
) =>
  computeOrderTotals(
    { customer: customer(), items: [{ productId: product.id, quantity }] },
    new Map([[product.id, product]]),
    SETTINGS,
    coupon,
    new Date(),
    promo,
  );

describe("pricing with referral and gift card", () => {
  it("is unchanged without them", () => {
    expect(totals(2, {})).toMatchObject({
      subtotal: 500,
      referralDiscount: 0,
      giftCardApplied: 0,
      total: 600,
    });
  });

  it("takes the referral off the items but never below zero, after the coupon", () => {
    const coupon = {
      code: "BIG",
      type: "fixed" as const,
      value: 450,
      usedCount: 0,
      isActive: true,
    };
    // 500 items, coupon takes 450, so only 50 is left for the referral to take.
    expect(totals(2, { referralDiscount: 100 }, coupon)).toMatchObject({
      discount: 450,
      referralDiscount: 50,
      total: 100,
    });
    expect(totals(2, { referralDiscount: 100 })).toMatchObject({
      referralDiscount: 100,
      total: 500,
    });
  });

  it("lets a gift card pay delivery too, and never more than is owed", () => {
    expect(totals(1, { giftCardBalance: 1000 })).toMatchObject({ giftCardApplied: 350, total: 0 });
    expect(totals(1, { giftCardBalance: 100 })).toMatchObject({ giftCardApplied: 100, total: 250 });
  });
});

describe("with the flags off", () => {
  it("refuses the order fields and answers 404 on the routes", async () => {
    const { app, admin, place } = await setup({});
    const referral = await place(ALICE, { referralCode: "MOM-ABC234" });
    expect(referral.status).toBe(400);
    expect(referral.body.error).toMatch(/not available/);
    const card = await place(ALICE, { giftCardCode: "GC-ABCD-EFGH" });
    expect(card.status).toBe(400);

    expect((await anon(app).post("/referrals/validate").send({ code: "MOM-ABC234" })).status).toBe(
      404,
    );
    expect(
      (await anon(app).post("/gift-cards/balance").send({ code: "GC-ABCD-EFGH" })).status,
    ).toBe(404);
    expect((await admin.post("/gift-cards").send({ amount: 500 })).status).toBe(404);

    // A plain order is exactly as before.
    const plain = await place(ALICE);
    expect(plain.status).toBe(201);
    expect(plain.body.data).toMatchObject({ referralDiscount: 0, giftCardApplied: 0, total: 350 });
  });
});

describe("gift cards", () => {
  it("are issued by admins only, with a generated code and a minimum amount", async () => {
    const { app, admin, staff } = await setup({ giftCards: true });
    expect((await anon(app).post("/gift-cards").send({ amount: 500 })).status).toBe(401);
    expect((await staff.post("/gift-cards").send({ amount: 500 })).status).toBe(403);
    expect((await staff.get("/gift-cards")).status).toBe(403);
    expect((await admin.post("/gift-cards").send({ amount: 50 })).status).toBe(400);

    const created = await admin.post("/gift-cards").send({ amount: 500, note: "For Sita" });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toMatch(/^GC-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(created.body.data).toMatchObject({ initialAmount: 500, balance: 500 });
    expect((await admin.get("/gift-cards")).body.data).toHaveLength(1);

    const dup = await admin.post("/gift-cards").send({ amount: 500, code: created.body.data.code });
    expect(dup.status).toBe(409);
  });

  it("show a balance to anyone with the code, and hide unknown or switched-off cards alike", async () => {
    const { app, admin } = await setup({ giftCards: true });
    const card = (await admin.post("/gift-cards").send({ amount: 500 })).body.data;
    const ok = await anon(app).post("/gift-cards/balance").send({ code: card.code.toLowerCase() });
    expect(ok.body.data).toEqual({ code: card.code, balance: 500 });
    expect(
      (await anon(app).post("/gift-cards/balance").send({ code: "GC-NOPE-NOPE" })).status,
    ).toBe(404);
    await admin.patch(`/gift-cards/${card.id}`).send({ isActive: false });
    expect((await anon(app).post("/gift-cards/balance").send({ code: card.code })).status).toBe(
      404,
    );
  });

  it("pay an order down, run out, and come back when the order is cancelled", async () => {
    const { admin, place, advance } = await setup({ giftCards: true });
    const card = (await admin.post("/gift-cards").send({ amount: 1000 })).body.data;

    // 2 magnets (500) + delivery (100) = 600, all paid by the card.
    const first = await place(ALICE, { giftCardCode: card.code }, 2);
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      giftCardApplied: 600,
      total: 0,
      giftCardCode: card.code,
    });
    expect((await GiftCardModel.findOne({ code: card.code }))?.balance).toBe(400);

    // 4 magnets = 1100 owed, the card pays the last 400.
    const second = await place(ALICE, { giftCardCode: card.code }, 4);
    expect(second.body.data).toMatchObject({ giftCardApplied: 400, total: 700 });
    expect((await GiftCardModel.findOne({ code: card.code }))?.balance).toBe(0);

    const empty = await place(ALICE, { giftCardCode: card.code });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toMatch(/no balance/);

    // Cancelling the first order returns its 600.
    await advance(first.body.data.id, ["cancelled"]);
    expect((await GiftCardModel.findOne({ code: card.code }))?.balance).toBe(600);
  });

  it("never let two orders spend the same money", async () => {
    const { admin, place } = await setup({ giftCards: true });
    const card = (await admin.post("/gift-cards").send({ amount: 300 })).body.data;
    const results = await Promise.all([
      place(ALICE, { giftCardCode: card.code }),
      place(BOB, { giftCardCode: card.code }),
    ]);
    // Exactly one order gets the money. The other is refused with 409 if the two raced for the balance,
    // or 400 ("no balance left") if it looked after the first had already spent it.
    const statuses = results.map((res) => res.status).sort();
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);
    expect((await GiftCardModel.findOne({ code: card.code }))?.balance).toBe(0);
    // The loser left no order behind.
    expect(await OrderModel.countDocuments()).toBe(1);
  });

  it("cannot be raised above the issued amount by a cancel", async () => {
    const { admin, place, advance } = await setup({ giftCards: true });
    const card = (await admin.post("/gift-cards").send({ amount: 500 })).body.data;
    const order = await place(ALICE, { giftCardCode: card.code });
    await GiftCardModel.updateOne({ code: card.code }, { $set: { balance: 500 } });
    await advance(order.body.data.id, ["cancelled"]);
    expect((await GiftCardModel.findOne({ code: card.code }))?.balance).toBe(500);
  });
});

describe("referrals", () => {
  it("give a customer a code once an order is delivered, and show it only with the right phone", async () => {
    const { place, deliver, track } = await setup({ referrals: true });
    const order = (await place(ALICE)).body.data;
    expect((await track(order.code, ALICE)).body.data.referral).toBeUndefined();

    await deliver(order.id);
    const { referral } = (await track(order.code, ALICE)).body.data;
    expect(referral).toMatchObject({ friendDiscount: 100, rewards: [] });
    expect(referral.code).toMatch(/^MOM-[A-Z2-9]{6}$/);
    // The stored record holds a hash, never the number.
    const stored = await ReferralModel.findOne({ code: referral.code }).lean();
    expect(JSON.stringify(stored)).not.toContain(ALICE.slice(-8));
  });

  it("take a fixed amount off a friend's order, and only once per phone", async () => {
    const { app, place, deliver, advance, track } = await setup({ referrals: true });
    const alice = (await place(ALICE)).body.data;
    await deliver(alice.id);
    const code = (await track(alice.code, ALICE)).body.data.referral.code as string;

    const check = await anon(app).post("/referrals/validate").send({ code: code.toLowerCase() });
    expect(check.body.data).toEqual({ code, discount: 100 });
    expect((await anon(app).post("/referrals/validate").send({ code: "MOM-NOPE22" })).status).toBe(
      400,
    );

    const bob = await place(BOB, { referralCode: code });
    expect(bob.status).toBe(201);
    expect(bob.body.data).toMatchObject({ referralDiscount: 100, referralCode: code, total: 250 });

    // Same phone again, with any code: refused.
    const again = await place(BOB, { referralCode: code });
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/already been used/);

    // Cancelling the order frees the phone to use it again.
    await advance(bob.body.data.id, ["cancelled"]);
    expect((await place(BOB, { referralCode: code })).status).toBe(201);
  });

  it("cannot be used on your own orders, and a refusal leaves no coupon use behind", async () => {
    const { place, deliver, track } = await setup({ referrals: true });
    const alice = (await place(ALICE)).body.data;
    await deliver(alice.id);
    const code = (await track(alice.code, ALICE)).body.data.referral.code as string;
    await CouponModel.create({ code: "TENOFF", type: "fixed", value: 10 });

    // +977 formatting is the same phone.
    const own = await place("+977 98-1234 5678", { referralCode: code, couponCode: "TENOFF" });
    expect(own.status).toBe(400);
    expect(own.body.error).toMatch(/own referral code/);
    expect((await CouponModel.findOne({ code: "TENOFF" }))?.usedCount).toBe(0);
    expect(await OrderModel.countDocuments()).toBe(1);
  });

  it("reward the referrer with one coupon when the friend's order is delivered", async () => {
    const { place, deliver, track } = await setup({ referrals: true });
    const alice = (await place(ALICE)).body.data;
    await deliver(alice.id);
    const code = (await track(alice.code, ALICE)).body.data.referral.code as string;

    const bob = (await place(BOB, { referralCode: code })).body.data;
    await deliver(bob.id);

    const { rewards } = (await track(alice.code, ALICE)).body.data.referral;
    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toMatchObject({ value: 100 });
    expect(rewards[0].code).toMatch(/^THANKS-/);

    // Issuing again for the same order does nothing.
    await issueReferrerReward(
      (await OrderModel.findById(bob.id))!,
      (await anon(testApp()).get("/settings")).body.data,
    );
    expect((await track(alice.code, ALICE)).body.data.referral.rewards).toHaveLength(1);

    // The reward is a normal one-use coupon.
    const spent = await place(ALICE, { couponCode: rewards[0].code });
    expect(spent.body.data).toMatchObject({ discount: 100, total: 250 });
    const twice = await place(ALICE, { couponCode: rewards[0].code });
    expect(twice.status).toBe(400);
    expect((await track(alice.code, ALICE)).body.data.referral.rewards).toEqual([]);
  });

  it("use the amounts from Settings", async () => {
    const { app, admin, place, deliver, track } = await setup({ referrals: true });
    await admin
      .put("/settings")
      .send({ ...SETTINGS, referral: { friendDiscount: 50, referrerReward: 30 } });
    const alice = (await place(ALICE)).body.data;
    await deliver(alice.id);
    const code = (await track(alice.code, ALICE)).body.data.referral.code as string;
    const bob = await place(BOB, { referralCode: code });
    expect(bob.body.data.referralDiscount).toBe(50);
    await deliver(bob.body.data.id);
    expect((await track(alice.code, ALICE)).body.data.referral.rewards[0].value).toBe(30);
    expect((await anon(app).get("/settings")).body.data.referral).toEqual({
      friendDiscount: 50,
      referrerReward: 30,
    });
  });
});

describe("festival banner setting", () => {
  it("is saved, validated and removed with null", async () => {
    const { app, admin } = await setup({});
    const banner = {
      text: "Dashain sale",
      href: "/shop",
      couponCode: "dashain",
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: "2026-10-10T00:00:00.000Z",
    };
    expect((await admin.put("/settings").send({ ...SETTINGS, banner })).status).toBe(200);
    expect((await anon(app).get("/settings")).body.data.banner).toMatchObject({
      text: "Dashain sale",
      couponCode: "DASHAIN",
      startsAt: "2026-10-01T00:00:00.000Z",
    });

    const bad = (patch: object) =>
      admin.put("/settings").send({ ...SETTINGS, banner: { ...banner, ...patch } });
    expect((await bad({ href: "javascript:alert(1)" })).status).toBe(400);
    expect((await bad({ href: "//evil.example" })).status).toBe(400);
    expect((await bad({ endsAt: "2026-09-01T00:00:00.000Z" })).status).toBe(400);
    expect((await bad({ text: "" })).status).toBe(400);

    await admin.put("/settings").send({ ...SETTINGS, banner: null });
    expect((await anon(app).get("/settings")).body.data.banner).toBeUndefined();
  });
});
