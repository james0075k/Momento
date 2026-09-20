import { describe, expect, it } from "vitest";
import {
  canTransitionOrderStatus,
  couponInputSchema,
  createOrderInputSchema,
  phoneSchema,
  productInputSchema,
  reviewInputSchema,
} from "./index";

const id = "a".repeat(24);

describe("phoneSchema", () => {
  it("normalises separators", () => {
    expect(phoneSchema.parse("+977 98-1234 5678")).toBe("+9779812345678");
    expect(phoneSchema.parse("9812345678")).toBe("9812345678");
  });
  it("rejects garbage", () => {
    expect(phoneSchema.safeParse("abc").success).toBe(false);
  });
});

describe("order status transitions", () => {
  it("allows the happy path and blocks skipping or reversing", () => {
    expect(canTransitionOrderStatus("pending_payment", "paid")).toBe(true);
    expect(canTransitionOrderStatus("paid", "printing")).toBe(true);
    expect(canTransitionOrderStatus("pending_payment", "shipped")).toBe(false);
    expect(canTransitionOrderStatus("delivered", "cancelled")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "paid")).toBe(false);
  });
});

describe("input schemas", () => {
  it("createOrderInput strips client prices and applies defaults", () => {
    const parsed = createOrderInputSchema.parse({
      customer: { name: "A", phone: "9812345678", address: "Baneshwor", area: "inside_valley" },
      items: [{ productId: id, quantity: 2, unitPrice: 1 }],
    });
    expect(parsed.paymentMethod).toBe("whatsapp");
    expect(parsed.items[0]).not.toHaveProperty("unitPrice");
  });
  it("percent coupon cannot exceed 100", () => {
    expect(couponInputSchema.safeParse({ code: "abc", type: "percent", value: 150 }).success).toBe(
      false,
    );
    expect(couponInputSchema.parse({ code: "abc", type: "percent", value: 10 }).code).toBe("ABC");
  });
  it("review needs exactly one target", () => {
    const base = { name: "A", rating: 5, comment: "Great" };
    expect(reviewInputSchema.safeParse(base).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...base, productId: id, serviceId: id }).success).toBe(
      false,
    );
    expect(reviewInputSchema.safeParse({ ...base, productId: id }).success).toBe(true);
  });
  it("product defaults arrays", () => {
    const p = productInputSchema.parse({
      title: "Book",
      slug: "book",
      categoryId: id,
      basePrice: 100,
    });
    expect(p.variants).toEqual([]);
    expect(p.faqs).toEqual([]);
  });
});
