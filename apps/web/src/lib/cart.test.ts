import type { Product } from "@momento/shared";
import { describe, expect, it } from "vitest";
import {
  addLine,
  cartCount,
  cartSubtotal,
  lineKey,
  parseCart,
  reconcileLine,
  removeLine,
  setQuantity,
  type CartLine,
} from "./cart";

const ID = "a".repeat(24);
const VARIANT = "b".repeat(24);
const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: ID,
  variantId: VARIANT,
  quantity: 1,
  title: "Book",
  slug: "book",
  unitPrice: 2500,
  ...over,
});

describe("cart lines", () => {
  it("merges the same product and variant, and keeps different variants apart", () => {
    let lines = addLine([], line());
    lines = addLine(lines, line({ quantity: 2 }));
    lines = addLine(lines, line({ variantId: "c".repeat(24) }));
    expect(lines).toHaveLength(2);
    expect(lines[0]?.quantity).toBe(3);
    expect(cartCount(lines)).toBe(4);
    expect(cartSubtotal(lines)).toBe(4 * 2500);
  });

  it("caps quantity at 50 and removes a line set to zero", () => {
    const key = lineKey(line());
    expect(setQuantity([line()], key, 999)[0]?.quantity).toBe(50);
    expect(setQuantity([line()], key, 0)).toEqual([]);
    expect(removeLine([line()], key)).toEqual([]);
  });
});

describe("parseCart", () => {
  it("survives garbage and drops malformed lines", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
    const raw = JSON.stringify([line(), { productId: "nope" }, null, line({ unitPrice: -1 })]);
    expect(parseCart(raw)).toHaveLength(2);
    expect(parseCart(raw)[1]?.unitPrice).toBe(0);
  });

  it("round-trips a saved cart", () => {
    const lines = [line({ quantity: 3, image: "https://x/y.jpg", variantLabel: "A4" })];
    expect(parseCart(JSON.stringify(lines))).toEqual(lines);
  });
});

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: ID,
    title: "Book",
    slug: "book",
    isActive: true,
    basePrice: 1000,
    images: [],
    variants: [{ id: VARIANT, size: "A4", cover: "Hardcover", pages: 40, price: 3000 }],
    ...over,
  }) as Product;

describe("reconcileLine", () => {
  it("takes the live price and flags the change", () => {
    const result = reconcileLine(line(), product());
    expect(result).toMatchObject({ state: "ok", changed: true });
    if (result.state === "ok") {
      expect(result.line.unitPrice).toBe(3000);
      expect(result.line.variantLabel).toBe("A4, Hardcover, 40 pages");
    }
  });

  it("marks removed, inactive or variant-less products unavailable", () => {
    expect(reconcileLine(line(), null).state).toBe("unavailable");
    expect(reconcileLine(line(), product({ isActive: false })).state).toBe("unavailable");
    expect(reconcileLine(line({ variantId: "d".repeat(24) }), product()).state).toBe("unavailable");
    expect(reconcileLine(line(), product({ variants: [] })).state).toBe("unavailable");
  });
});
