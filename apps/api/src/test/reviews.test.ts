import { describe, expect, it } from "vitest";
import { ReviewModel } from "../models/Review";
import { anon, createCatalog, customer, loginAs, testApp } from "./helpers";

const review = (productId: string, extra: Record<string, unknown> = {}) => ({
  productId,
  name: "Anita",
  rating: 5,
  title: "Lovely",
  comment: "Beautiful album, arrived in two days.",
  ...extra,
});

describe("review moderation", () => {
  it("public submissions start as pending and are hidden from the public list", async () => {
    const app = testApp();
    const { book } = await createCatalog();

    const created = await anon(app).post("/reviews").send(review(book.id));
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("pending");

    const list = await anon(app).get(`/reviews?productId=${book.id}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(0);
    expect(list.body.meta.total).toBe(0);
  });

  it("a client cannot self-approve by sending a status", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const created = await anon(app)
      .post("/reviews")
      .send(review(book.id, { status: "approved", verified: true }));
    expect(created.status).toBe(201);
    const stored = await ReviewModel.findById(created.body.data.id);
    expect(stored?.status).toBe("pending");
    expect(stored?.verified).toBe(false);
  });

  it("anonymous callers cannot see non-approved reviews even with ?status=", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    await anon(app).post("/reviews").send(review(book.id));
    const res = await anon(app).get("/reviews?status=pending");
    expect(res.body.data).toHaveLength(0);
  });

  it("staff can list pending reviews, approve one, and it then appears publicly", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const created = await anon(app).post("/reviews").send(review(book.id));
    const id = created.body.data.id as string;

    const staff = await loginAs(app, "staff");
    const pending = await staff.get("/reviews?status=pending");
    expect(pending.body.data.map((r: { id: string }) => r.id)).toEqual([id]);

    const approved = await staff.patch(`/reviews/${id}/status`).send({ status: "approved" });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("approved");

    const publicList = await anon(app).get(`/reviews?productId=${book.id}`);
    expect(publicList.body.data).toHaveLength(1);
    expect(publicList.body.data[0]).toMatchObject({ name: "Anita", rating: 5, status: "approved" });
  });

  it("rejecting (or un-approving) a review removes it from the public list", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const id = (await anon(app).post("/reviews").send(review(book.id))).body.data.id as string;
    const staff = await loginAs(app, "staff");

    await staff.patch(`/reviews/${id}/status`).send({ status: "approved" });
    expect((await anon(app).get("/reviews")).body.data).toHaveLength(1);

    await staff.patch(`/reviews/${id}/status`).send({ status: "rejected" });
    expect((await anon(app).get("/reviews")).body.data).toHaveLength(0);
    expect((await staff.get("/reviews?status=rejected")).body.data).toHaveLength(1);
  });

  it("moderation and deletion require authentication and the right role", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const id = (await anon(app).post("/reviews").send(review(book.id))).body.data.id as string;

    expect(
      (await anon(app).patch(`/reviews/${id}/status`).send({ status: "approved" })).status,
    ).toBe(401);
    expect((await anon(app).delete(`/reviews/${id}`)).status).toBe(401);

    const staff = await loginAs(app, "staff");
    expect((await staff.delete(`/reviews/${id}`)).status).toBe(403);

    const admin = await loginAs(app, "admin");
    expect((await admin.delete(`/reviews/${id}`)).status).toBe(204);
    expect(await ReviewModel.countDocuments()).toBe(0);
  });

  it("rejects an invalid moderation status", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const id = (await anon(app).post("/reviews").send(review(book.id))).body.data.id as string;
    const staff = await loginAs(app, "staff");
    expect(
      (await staff.patch(`/reviews/${id}/status`).send({ status: "pending_review" })).status,
    ).toBe(400);
  });
});

describe("review validation", () => {
  it("rejects bad ratings, missing comment and ambiguous targets", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const post = (body: Record<string, unknown>) => anon(app).post("/reviews").send(body);

    expect((await post(review(book.id, { rating: 6 }))).status).toBe(400);
    expect((await post(review(book.id, { rating: 0 }))).status).toBe(400);
    expect((await post(review(book.id, { comment: "" }))).status).toBe(400);
    expect((await post(review(book.id, { serviceId: book.id }))).status).toBe(400);
    expect((await post({ name: "A", rating: 5, comment: "no target" })).status).toBe(400);
    expect((await post(review("c".repeat(24)))).status).toBe(400); // product does not exist
    expect(await ReviewModel.countDocuments()).toBe(0);
  });

  it("rate limits review submissions", async () => {
    const app = testApp({ createReview: 2 });
    const { book } = await createCatalog();
    const send = () => anon(app).post("/reviews").send(review(book.id));
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(429);
  });
});

describe("verified reviews", () => {
  it("marks a review verified only when order code and phone match an order containing the product", async () => {
    const app = testApp();
    const { book, magnet } = await createCatalog();
    const order = await anon(app)
      .post("/orders")
      .send({
        customer: customer(),
        items: [{ productId: book.id, variantId: book.variants[0]!.id, quantity: 1 }],
      });
    const code = order.body.data.code as string;
    const staff = await loginAs(app, "staff");

    const good = await anon(app)
      .post("/reviews")
      .send(review(book.id, { orderCode: code, orderPhone: "+977 9812345678" }));
    const wrongPhone = await anon(app)
      .post("/reviews")
      .send(review(book.id, { orderCode: code, orderPhone: "9800000000" }));
    const wrongProduct = await anon(app)
      .post("/reviews")
      .send(review(magnet.id, { orderCode: code, orderPhone: "9812345678" }));

    expect((await ReviewModel.findById(good.body.data.id))?.verified).toBe(true);
    expect((await ReviewModel.findById(wrongPhone.body.data.id))?.verified).toBe(false);
    expect((await ReviewModel.findById(wrongProduct.body.data.id))?.verified).toBe(false);

    // Approve the verified one: public sees verified=true but never the order code.
    await staff.patch(`/reviews/${good.body.data.id}/status`).send({ status: "approved" });
    const publicList = await anon(app).get("/reviews");
    expect(publicList.body.data[0].verified).toBe(true);
    expect(JSON.stringify(publicList.body)).not.toContain(code);
    // Staff do see it.
    const staffList = await staff.get("/reviews?status=approved");
    expect(staffList.body.data[0].verifiedOrderCode).toBe(code);
  });

  it("requires orderCode and orderPhone together", async () => {
    const app = testApp();
    const { book } = await createCatalog();
    const res = await anon(app)
      .post("/reviews")
      .send(review(book.id, { orderCode: "MOM-2026-0001" }));
    expect(res.status).toBe(400);
  });
});
