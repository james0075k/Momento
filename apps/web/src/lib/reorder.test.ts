import type { Product } from "@momento/shared";
import { describe, expect, it } from "vitest";
import { buildReorderLines } from "./reorder";

const id = (n: number) => n.toString(16).padStart(24, "0");

const product = (over: Partial<Product>): Product => ({
  id: id(1),
  title: "Photo Book",
  slug: "photo-book",
  categoryId: id(9),
  shortDescription: "",
  description: "",
  images: ["https://res.cloudinary.com/demo/image/upload/a.jpg"],
  basePrice: 1000,
  variants: [],
  highlights: [],
  occasions: [],
  specs: [],
  faqs: [],
  isFeatured: false,
  isActive: true,
  createdAt: "",
  updatedAt: "",
  ...over,
});

const item = (
  over: Partial<{ productId: string; variantId: string; title: string; quantity: number }>,
) => ({
  productId: id(1),
  title: "Photo Book",
  quantity: 2,
  lineTotal: 0,
  ...over,
});

describe("buildReorderLines", () => {
  it("uses today's price, not what was paid before", () => {
    const current = product({
      variants: [{ id: id(5), size: "A5", cover: "Softcover", pages: 20, price: 2200 }],
    });
    const { lines, skipped } = buildReorderLines(
      [item({ variantId: id(5) })],
      new Map([[id(1), current]]),
    );
    expect(skipped).toEqual([]);
    expect(lines).toEqual([
      {
        productId: id(1),
        variantId: id(5),
        quantity: 2,
        title: "Photo Book",
        slug: "photo-book",
        image: "https://res.cloudinary.com/demo/image/upload/a.jpg",
        variantLabel: "A5, Softcover, 20 pages",
        unitPrice: 2200,
      },
    ]);
  });

  it("prices a product without sizes at its base price", () => {
    const { lines } = buildReorderLines(
      [item({})],
      new Map([[id(1), product({ basePrice: 350 })]]),
    );
    expect(lines[0]).toMatchObject({
      unitPrice: 350,
      variantId: undefined,
      variantLabel: undefined,
    });
  });

  it("skips products that are gone or switched off, and sizes that were removed", () => {
    const withSizes = product({
      id: id(2),
      title: "Frame",
      variants: [{ id: id(6), size: "A4", price: 900 }],
    });
    const result = buildReorderLines(
      [
        item({ productId: id(3), title: "Deleted" }),
        item({ productId: id(4), title: "Off" }),
        item({ productId: id(2), title: "Frame", variantId: id(7) }),
        item({ productId: id(2), title: "Frame", variantId: id(6) }),
      ],
      new Map<string, Product | null>([
        [id(3), null],
        [id(4), product({ id: id(4), isActive: false })],
        [id(2), withSizes],
      ]),
    );
    expect(result.skipped).toEqual(["Deleted", "Off", "Frame"]);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ variantId: id(6), unitPrice: 900 });
  });
});
