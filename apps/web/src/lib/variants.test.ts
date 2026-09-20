import type { ProductVariant } from "@momento/shared";
import { describe, expect, it } from "vitest";
import { lowestPrice, pickVariant, sizeScale, variantGroups } from "./variants";

const v = (
  id: string,
  size: string,
  cover: string | undefined,
  pages: number | undefined,
  price: number,
) => ({ id: id.repeat(24), size, cover, pages, price }) as ProductVariant;

const variants = [
  v("1", "A5", "Softcover", 20, 1500),
  v("2", "A4", "Softcover", 20, 2000),
  v("3", "A4", "Hardcover", 40, 2500),
];

describe("variant picker", () => {
  it("lists each attribute once, in order, and skips attributes nobody sets", () => {
    expect(variantGroups(variants).map((g) => [g.key, g.values])).toEqual([
      ["size", ["A5", "A4"]],
      ["cover", ["Softcover", "Hardcover"]],
      ["pages", [20, 40]],
    ]);
    expect(variantGroups([v("1", "8x10", undefined, undefined, 900)]).map((g) => g.key)).toEqual([
      "size",
    ]);
  });

  it("keeps the other choices when that combination exists", () => {
    expect(pickVariant(variants, variants[1], "cover", "Hardcover")?.id).toBe(variants[2]?.id);
    expect(pickVariant(variants, variants[0], "size", "A4")?.id).toBe(variants[1]?.id);
  });

  it("falls back to the closest variant when it does not", () => {
    // A5 only comes softcover, so choosing A5 from A4 hardcover lands on A5 softcover.
    expect(pickVariant(variants, variants[2], "size", "A5")?.id).toBe(variants[0]?.id);
    expect(pickVariant(variants, undefined, "pages", 40)?.id).toBe(variants[2]?.id);
  });

  it("finds the lowest price", () => {
    expect(lowestPrice(999, variants)).toBe(1500);
    expect(lowestPrice(999, [])).toBe(999);
  });
});

describe("sizeScale", () => {
  it("orders A sizes and inch sizes, with a medium fallback", () => {
    expect(sizeScale("A5")).toBeLessThan(sizeScale("A4"));
    expect(sizeScale("A4")).toBeLessThan(sizeScale("A3"));
    expect(sizeScale("8x10 in")).toBeLessThan(sizeScale("16 x 20 in"));
    expect(sizeScale("Small")).toBe(0.5);
  });
});
